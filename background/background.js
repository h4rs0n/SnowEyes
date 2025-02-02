// 更新扩展图标的badge
function updateBadge(results) {
  // 计算有内容的类别数量
  const categories = [
    results.domains,
    results.absoluteApis,
    results.apis,
    results.moduleFiles,
    results.docFiles,
    results.ips,
    results.phones,
    results.emails,
    results.idcards,
    results.jwts,
    results.imageFiles,
    results.jsFiles,
    results.vueFiles,
    results.urls,
    results.githubUrls,
    results.companies,
    results.credentials,
    results.cookies,
    results.idKeys,     // 添加ID密钥结果集
  ];

  const nonEmptyCategories = categories.filter(category => 
    Array.isArray(category) && category.length > 0
  ).length;

  // 更新badge
  chrome.action.setBadgeText({ 
    text: nonEmptyCategories > 0 ? nonEmptyCategories.toString() : ''
  });

  // 根据是否有内容设置不同的颜色
  chrome.action.setBadgeBackgroundColor({ 
    color: nonEmptyCategories > 0 ? '#4dabf7' : '#666666'
  });
}

// 存储服务器指纹信息
let serverFingerprints = new Map();  // 使用 Map 存储每个标签页的指纹信息

// 监听网络请求
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    // 只处理主文档请求
    if (details.type === 'main_frame') {
      const headers = details.responseHeaders;
      if (headers) {
        const fingerprints = {
          server: null,
          headers: new Map(),
          technology: null
        };

        // 遍历所有响应头
        headers.forEach(header => {
          const name = header.name.toLowerCase();
          
          if (name === 'server') {
            fingerprints.server = header.value;
          }
          else if (['x-powered-by', 'x-aspnet-version', 'x-runtime'].includes(name)) {
            fingerprints.headers.set(name, header.value);
          }
          else if (name === 'set-cookie') {
            const tech = identifyTechnology(header.value);
            if (tech) {
              fingerprints.technology = tech;
            }
          }
        });

        // 如果没有从 Set-Cookie 头识别出技术，尝试从现有 cookies 识别
        if (!fingerprints.technology) {
          chrome.cookies.getAll({url: details.url}, (cookies) => {
            if (cookies && cookies.length > 0) {
              // 将所有 cookie 名称拼接起来用于识别
              console.log(cookies);
              const cookieNames = cookies.map(cookie => cookie.name).join(';');
              console.log(cookieNames);
              const tech = identifyTechnology(cookieNames);
              if (tech) {
                fingerprints.technology = tech;
                // 更新存储
                serverFingerprints.set(details.tabId, fingerprints);
                // 通知更新
                try {
                  chrome.tabs.sendMessage(details.tabId, {
                    type: 'UPDATE_FINGERPRINTS',
                    fingerprints: {
                      server: fingerprints.server,
                      headers: Object.fromEntries(fingerprints.headers),
                      technology: fingerprints.technology
                    }
                  }).catch(() => {});
                } catch (e) {}
              }
            }
          });
        }

        // 存储该标签页的指纹信息
        serverFingerprints.set(details.tabId, fingerprints);

        // 延迟发送消息，等待内容脚本加载
        setTimeout(() => {
          try {
            chrome.tabs.sendMessage(details.tabId, {
              type: 'UPDATE_FINGERPRINTS',
              fingerprints: {
                server: fingerprints.server,
                headers: Object.fromEntries(fingerprints.headers),
                technology: fingerprints.technology
              }
            }).catch(() => {
              // 忽略发送失败的错误
            });
          } catch (e) {
            // 忽略错误
          }
        }, 1000);  // 延迟1秒
      }
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// 监听标签页关闭事件，清理数据
chrome.tabs.onRemoved.addListener((tabId) => {
  serverFingerprints.delete(tabId);
});

// 添加消息监听器处理 popup 的请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_FINGERPRINTS') {
    // 获取当前标签页的指纹信息
    const fingerprints = serverFingerprints.get(request.tabId);
    if (fingerprints) {
      sendResponse({
        server: fingerprints.server,
        headers: Object.fromEntries(fingerprints.headers),
        technology: fingerprints.technology
      });
    } else {
      sendResponse(null);
    }
    return true;
  }
  if (request.type === 'FETCH_JS') {
    // 使用 fetch API 获取文件内容
    fetch(request.url, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      credentials: 'omit'  // 不发送 cookies
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then(content => {
      sendResponse({ content });
    })
    .catch(error => {
      // 如果 fetch 失败，尝试使用 chrome.scripting.executeScript
      if (sender.tab) {
        chrome.scripting.executeScript({
          target: { tabId: sender.tab.id },
          function: (url) => {
            return fetch(url, {
              credentials: 'omit'
            }).then(r => r.text());
          },
          args: [request.url]
        })
        .then(results => {
          if (results[0]?.result) {
            sendResponse({ content: results[0].result });
          } else {
            sendResponse({ content: null });
          }
        })
        .catch(() => {
          sendResponse({ content: null });
        });
      } else {
        sendResponse({ content: null });
      }
    });

    return true; // 保持消息通道打开
  } else if (request.type === 'UPDATE_BADGE') {
    // 处理badge更新请求
    updateBadge(request.results);
  }
});

// 识别技术栈
function identifyTechnology(cookieHeader) {
  const patterns = {
    'PHP': {
      pattern: /PHPSESSID/i,
      description: '通过Session Cookie识别，使用PHP作为服务端语言'
    },
    'ASP.NET': {
      pattern: /ASP\.NET_SessionId/i,
      description: '通过Session Cookie识别，使用ASP.NET作为服务端语言'
    },
    'Java': {
      pattern: /JSESSIONID/i,
      description: '通过Session Cookie识别，使用Java作为服务端语言'
    },
    'Django': {
      pattern: /sessionid.*django/i,
      description: '通过Session Cookie识别，使用Django(Python)作为服务端框架'
    },
    'Rails': {
      pattern: /_session_id=.*rack/i,
      description: '通过Session Cookie识别，使用Ruby on Rails作为服务端框架'
    },
    'Laravel': {
      pattern: /laravel_session/i,
      description: '通过Session Cookie识别，使用Laravel(PHP)作为服务端框架'
    }
  };

  for (const [tech, {pattern, description}] of Object.entries(patterns)) {
    if (pattern.test(cookieHeader)) {
      console.log(tech);
      return {name: tech, description};
    }
  }

  return null;
} 