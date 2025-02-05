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

// 识别技术栈
function parseServerHeader(serverHeader) {
  const components = {
    webServer: null,    // Web服务器信息
    os: null,          // 操作系统信息
    extensions: [],    // 扩展信息(如OpenSSL)
    modules: []        // 服务器模块
  };

  // 通过空格分割不同组件
  const parts = serverHeader.split(' ').filter(part => part.length > 0);
  
  parts.forEach(part => {
    // 处理括号中的操作系统信息
    if (part.startsWith('(') && part.endsWith(')')) {
      const osInfo = part.slice(1, -1);
      if (osInfo.toLowerCase().includes('win')) {
        components.os = {
          name: 'Windows',
          version: osInfo
        };
      } else if (osInfo.toLowerCase().includes('linux')) {
        components.os = {
          name: 'Linux',
          version: osInfo
        };
      }else if (osInfo.toLowerCase().includes('ubuntu')) {
        components.os = {
          name: 'Ubuntu',
          version: osInfo
        };

      }
      return;
    }

    // 先检查是否是已知的Web服务器
    const serverName = part.split('/')[0].toLowerCase();
    if (/apache|nginx|iis|litespeed|resin/i.test(serverName)) {
      // 处理 Apache 的特殊变体
      if (serverName.includes('apache')) {
        if (serverName.includes('coyote')) {
          components.webServer = {
            name: 'Apache',
            subType: 'Tomcat',
            version: null,
            component: {
              name: 'Coyote',
              version: part.includes('/') ? part.split('/')[1] : null
            }
          };
        } else if (serverName.includes('jserv')) {
          components.webServer = {
            name: 'Apache',
            subType: 'JServ',
            version: null,
            component: {
              name: 'JServ',
              version: part.includes('/') ? part.split('/')[1] : null
            }
          };
        } else {
          components.webServer = {
            name: 'Apache',
            version: part.includes('/') ? part.split('/')[1] : null
          };
        }
      } else {
        // 对于其他服务器，首字母大写
        const name = serverName.charAt(0).toUpperCase() + serverName.slice(1);
        components.webServer = {
          name: name,
          version: part.includes('/') ? part.split('/')[1] : null
        };
        
        // 如果是 IIS，直接判定为 Windows 系统
        if (serverName.includes('microsoft-iis') && !components.os) {
          components.os = {
            name: 'Windows',
            version: 'windows'
          };
        }
      }
    }
    // 处理其他组件
    else if (part.includes('/')) {
      const [name, version] = part.split('/');
      
      // 处理特殊的服务器名称
      if (/WWW\s*Server|Server/i.test(part)) {
        const fullName = name.replace('/', ' ');
        components.webServer = {
          name: fullName,
          version: version
        };
      }
      // 处理 OpenSSL
      else if (name === 'OpenSSL') {
        components.extensions.push({
          name: 'OpenSSL',
          version: version,
          type: 'ssl'
        });
      }
      // 处理模块
      else if (name.startsWith('mod_')) {
        components.modules.push({
          name: name.replace('mod_', ''),
          version: version
        });
      }
      // 处理其他未知的服务器类型
      else if (/server|www/i.test(name)) {
        components.webServer = {
          name: name,
          version: version
        };
      }
      // 其他扩展
      else {
        components.extensions.push({
          name: name,
          version: version,
          type: 'other'
        });
      }
    }
  });

  console.log(components);
  return components;
}

// 在 parseServerHeader 函数后添加 webpack 检测函数
function detectWebpack(pageContent) {
  // 检查页面内容中的特征
  if (/(webpackJsonp|__webpack_require__|webpack-dev-server)/.test(pageContent)) {
    return {
      name: 'Webpack',
      description: '通过页面特征识别到Webpack构建工具'
    };
  }

  // 检查 chunk 文件命名特征
  if (/(?:chunk|main|app|vendor|common)s?(?:[-.][a-f0-9]{8,20})*.(?:css|js)/.test(pageContent)) {
    return {
      name: 'Webpack',
      description: '通过文件命名特征识别到Webpack构建工具'
    };
  }

  // 检查 sourcemap 特征
  if (/\/\/# sourceMappingURL=.*\.[a-f0-9]{8,20}\.js\.map/.test(pageContent)) {
    return {
      name: 'Webpack',
      description: '通过Source Map特征识别到Webpack构建工具'
    };
  }

  return null;
}

// 监听网络请求
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    // 只处理主文档请求
    if (details.type === 'main_frame') {
      const headers = details.responseHeaders;
      if (headers) {
        const fingerprints = {
          server: null,
          serverComponents: null,  // 新增服务器组件信息
          headers: new Map(),
          technology: null,
          security: null  // 添加安全组件信息
        };

        // 遍历所有响应头
        headers.forEach(header => {
          const name = header.name.toLowerCase();
          
          if (name === 'server') {
            fingerprints.server = header.value;
            fingerprints.serverComponents = parseServerHeader(header.value);
          }
          else if (name === 'strict-transport-security') {
            // 解析 HSTS 头
            const maxAge = header.value.match(/max-age=(\d+)/)?.[1] || 'unknown';
            fingerprints.security = {
              name: 'HSTS',
              description: `通过Strict-Transport-Security响应头识别，网站启用了HSTS安全策略，max-age=${maxAge}秒`,
              version: maxAge,  // 使用 maxAge 作为版本号显示
              provider: 'Strict-Transport-Security'  // 添加 provider 字段以符合显示逻辑
            };
          }
          else if (name === 'x-powered-by') {
            // 从 X-Powered-By 识别技术栈
            const tech = identifyTechnologyFromHeader(header.value);
            if (tech) {
              fingerprints.technology = tech;
            }
            fingerprints.headers.set(name, header.value);
          }
          // 处理 ASP.NET 相关头
          else if (name === 'x-aspnetmvc-version') {
            const mvcVersion = header.value;
            fingerprints.headers.set(name, header.value);  // 添加到 headers 集合
            if (!fingerprints.technology) {
              fingerprints.technology = {
                name: 'ASP.NET MVC',
                description: `通过X-AspNetMvc-Version响应头识别，网站使用ASP.NET MVC框架，版本号为${mvcVersion}`,
                framework: 'MVC',
                version: mvcVersion
              };
            } else if (fingerprints.technology.name === 'ASP.NET') {
              // 更新已有的 ASP.NET 信息
              fingerprints.technology.name = 'ASP.NET MVC';
              fingerprints.technology.framework = 'MVC';
              fingerprints.technology.version = mvcVersion;
              fingerprints.technology.description = 
                `通过响应头识别，网站使用ASP.NET MVC框架，版本号为${mvcVersion}，运行在.NET Framework ${fingerprints.technology.runtime || '未知版本'}`;
            }
          }
          else if (name === 'x-aspnet-version') {
            const runtimeVersion = header.value;
            fingerprints.headers.set(name, header.value);  // 添加到 headers 集合
            if (!fingerprints.technology) {
              fingerprints.technology = {
                name: 'ASP.NET',
                description: `通过X-AspNet-Version响应头识别，网站运行在.NET Framework ${runtimeVersion}环境`,
                runtime: runtimeVersion
              };
            } else if (fingerprints.technology.name.includes('ASP.NET')) {
              // 更新运行时信息
              fingerprints.technology.runtime = runtimeVersion;
              fingerprints.technology.description = 
                `通过响应头识别，网站使用${fingerprints.technology.name}${fingerprints.technology.framework ? ' ' + fingerprints.technology.framework : ''}框架，` +
                `版本号为${fingerprints.technology.version || '未知'}，运行在.NET Framework ${runtimeVersion}`;
            }
          }
          else if (name === 'set-cookie' && !fingerprints.technology) {
            // 只有在没有从其他头识别出技术栈时，才尝试从 cookie 识别
            const tech = identifyTechnology(header.value);
            if (tech) {
              fingerprints.technology = tech;
            }
          }
          // 添加对安全防火墙头的处理
          else if (name === 'x-safe-firewall') {
            fingerprints.security = parseSecurityHeader(header.value);
          }
        });

        // 如果没有从响应头识别出技术，再尝试从现有 cookies 识别
        if (!fingerprints.technology) {
          chrome.cookies.getAll({url: details.url}, (cookies) => {
            if (cookies && cookies.length > 0) {
              const cookieNames = cookies.map(cookie => cookie.name).join(';');
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
                      serverComponents: fingerprints.serverComponents,
                      headers: Object.fromEntries(fingerprints.headers),
                      technology: fingerprints.technology,
                      security: fingerprints.security
                    }
                  }).catch(() => {});
                } catch (e) {}
              }
            }
          });
        }

        // 在处理完响应头后,尝试检测 webpack
        fetch(details.url)
          .then(response => response.text())
          .then(body => {
            const webpackTech = detectWebpack(body);
            if (webpackTech && !fingerprints.technology) {
              fingerprints.technology = webpackTech;
              // 更新存储
              serverFingerprints.set(details.tabId, fingerprints);
              // 通知更新
              try {
                chrome.tabs.sendMessage(details.tabId, {
                  type: 'UPDATE_FINGERPRINTS',
                  fingerprints: {
                    server: fingerprints.server,
                    serverComponents: fingerprints.serverComponents,
                    headers: Object.fromEntries(fingerprints.headers),
                    technology: fingerprints.technology,
                    security: fingerprints.security
                  }
                }).catch(() => {});
              } catch (e) {}
            }
          })
          .catch(() => {/* 忽略错误 */});

        // 存储该标签页的指纹信息
        serverFingerprints.set(details.tabId, fingerprints);

        // 延迟发送消息，等待内容脚本加载
        setTimeout(() => {
          try {
            chrome.tabs.sendMessage(details.tabId, {
              type: 'UPDATE_FINGERPRINTS',
              fingerprints: {
                server: fingerprints.server,
                serverComponents: fingerprints.serverComponents,
                headers: Object.fromEntries(fingerprints.headers),
                technology: fingerprints.technology,
                security: fingerprints.security
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
        serverComponents: fingerprints.serverComponents,
        headers: Object.fromEntries(fingerprints.headers),
        technology: fingerprints.technology,
        security: fingerprints.security
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
      description: '通过Cookie识别，网站使用PHP作为服务端语言'
    },
    'ASP.NET': {
      pattern: /ASP\.NET_SessionId/i,
      description: '通过Cookie识别，网站使用ASP.NET作为服务端语言'
    },
    'Java': {
      pattern: /JSESSIONID|SESSIONID|jeesite/i,
      description: '通过Cookie识别，网站使用Java作为服务端语言'
    },
    'Django': {
      pattern: /sessionid.*django/i,
      description: '通过Cookie识别，网站使用Django(Python)作为服务端框架'
    },
    'Rails': {
      pattern: /_session_id=.*rack/i,
      description: '通过Cookie识别，网站使用Ruby on Rails作为服务端框架'
    },
    'Laravel': {
      pattern: /laravel_session/i,
      description: '通过Cookie识别，网站使用Laravel(PHP)作为服务端框架'
    }
  };


  for (const [tech, {pattern, description}] of Object.entries(patterns)) {
    if (pattern.test(cookieHeader)) {
      return {name: tech, description};
    }
  }

  return null;
}

// 从响应头识别技术栈
function identifyTechnologyFromHeader(headerValue) {
  // 处理 PHP/7.3.4 这样的格式
  if (headerValue.toLowerCase().startsWith('php/')) {
    const version = headerValue.split('/')[1];
    return {
      name: 'PHP',
      description: `通过X-Powered-By响应头识别，网站使用PHP作为服务端语言，版本号为${version}`
    };
  }
  
  // 可以添加其他技术的识别
  const patterns = {
    'ASP.NET': {
      pattern: /ASP\.NET/i,
      getVersion: (value) => value.split('/')[1] || null
    },
    'Java': {
      pattern: /Java/i,
      getVersion: (value) => value.split('/')[1] || null
    }
  };

  for (const [tech, {pattern, getVersion}] of Object.entries(patterns)) {
    if (pattern.test(headerValue)) {
      const version = getVersion(headerValue);
      return {
        name: tech,
        description: `通过X-Powered-By响应头识别，网站使用${tech}作为服务端语言${version ? '，版本号为' + version : ''}`
      };
    }
  }

  return null;
}

// 解析安全相关头部
function parseSecurityHeader(headerValue) {
  // 处理 360 防火墙
  if (headerValue.includes('zhuji.360.cn')) {
    const parts = headerValue.split(' ').filter(part => part.length > 0);
    return {
      name: '360安全防火墙',
      provider: parts[0],  // zhuji.360.cn
      version: parts[1],   // 1.0.8.8
      extra: parts[2],      // F1W1
      description: `通过X-Safe-Firewall响应头识别安全防护组件为360安全防火墙，版本号为${parts[1]}, 附带信息${parts[2]}`
    };
  }
  return null;
} 