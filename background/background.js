import { FINGERPRINT_CONFIG } from './config/fingerprint.config.js';

// 更新扩展图标的badge
function updateBadge(results) {
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
    results.idKeys,
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
let serverFingerprints = new Map();

const analyticsDetected = {
  baidu: new Map(),    
  yahoo: new Map(),    
  google: new Map(),   
};
// 统计服务检测处理函数
function handleAnalyticsDetection(details, type) {
  let fingerprints = serverFingerprints.get(details.tabId);
  if (!fingerprints) {
    fingerprints = {
      server: [],
      serverComponents: [],
      technology: [],
      security: [],
      analytics: [],
      builder: [],
      framework: [],
      os: []
    };
    serverFingerprints.set(details.tabId, fingerprints);
  }

  // 更新或设置 analytics 信息
  if (!analyticsDetected[type].get(details.tabId)) {
    analyticsDetected[type].set(details.tabId, true);
    fingerprints.analytics.push({
      name: FINGERPRINT_CONFIG.ANALYTICS[type].name,
      description: FINGERPRINT_CONFIG.ANALYTICS[type].description,
      version: FINGERPRINT_CONFIG.ANALYTICS[type].version
    });

    // 更新存储
    serverFingerprints.set(details.tabId, fingerprints);
  }
}

// 为每个统计服务添加监听器
Object.entries(FINGERPRINT_CONFIG.ANALYTICS).forEach(([type, config]) => {
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => handleAnalyticsDetection(details, type),
    { urls: [config.pattern] },
    []
  );
});

// 在标签页关闭时清理检测状态
chrome.tabs.onRemoved.addListener((tabId) => {
  Object.values(analyticsDetected).forEach(map => map.delete(tabId));
  serverFingerprints.delete(tabId);
});

// 在标签页更新时重置检测状态
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    Object.values(analyticsDetected).forEach(map => map.delete(tabId));
  }
});

// 识别Cookie
function identifyTechnologyFromCookie(cookieHeader) {
  for (const cookie of FINGERPRINT_CONFIG.COOKIES) {
    if (cookie.match.test(cookieHeader)) {
      return {
        type: cookie.type,
        name: cookie.name,
        description: `通过cookie识别到网站使用${cookie.name}作为服务端${FINGERPRINT_CONFIG.DESCRIPTIONS.find(item=>item.name===cookie.type)?.description}`
      }
    }
  }
  return null;
}
// 识别Header
function processHeaders(headers) {
  const fingerprints = {
    server: [],
    serverComponents: [],
    technology: [],
    security: [],
    analytics: [],  // 保持为对象
    builder: [],    // 保持为对象
    framework: [],
    os: []
  };

  // 将headers转换为Map以便快速查找
  const headerMap = new Map(
    headers.map(h => [h.name.toLowerCase(), h.value])
  );

  // 遍历所有指纹配置进行匹配
  for (const config of FINGERPRINT_CONFIG.HEADERS) {
    const headerValue = headerMap.get(config.header);
    if (headerValue) {
      const result = headerValue.match(config.pattern);
      if (result&&!fingerprints[config.type].find(item=>item.name===config.name)) {
        var fingerprint = config;
        fingerprint['description'] = `通过${fingerprint.header}识别到网站使用${fingerprint.name}${FINGERPRINT_CONFIG.DESCRIPTIONS.find(item=>item.name===config.type)?.description}`;
        var i = 1;
        if(config.value){
          if(result.length>1){
            for (const value of config.value.split(',')) {
              fingerprint[value] = result[i]?result[i]:null;
              fingerprint['description'] += `，${FINGERPRINT_CONFIG.DESCRIPTIONS.find(item=>item.name===value)?.description}为${fingerprint[value]||'未知'}`;
              i++;
            }
          }else{
            fingerprint[config.value] = result[0]?result[0]:null;
            fingerprint['description'] += `，${FINGERPRINT_CONFIG.DESCRIPTIONS.find(item=>item.name===config.value)?.description}为${fingerprint[config.value]||'未知'}`;
          }
        }
        fingerprints[config.type].push(fingerprint);  // 使用 push 而不是 add
      }
    }
  }
  return fingerprints;
}

// 监听器识别指纹
chrome.webRequest.onHeadersReceived.addListener(
  async (details) => {
    if (details.type !== 'main_frame' || !details.responseHeaders) return;
    
    const fingerprints = processHeaders(details.responseHeaders);
    serverFingerprints.set(details.tabId, fingerprints);
    
    // 获取 cookies 并检查是否可以识别出技术栈
    chrome.cookies.getAll({ url: details.url }, (cookies) => {
      if (cookies.length > 0) {
        const cookieNames = cookies.map(cookie => cookie.name).join(';');
        const techFromCookies = identifyTechnologyFromCookie(cookieNames);
        if (techFromCookies&&!fingerprints[techFromCookies.type].find(item=>item.name===techFromCookies.name)) fingerprints[techFromCookies.type].push(techFromCookies);
      }
    });

    return { responseHeaders: details.responseHeaders };
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// 监听器更新指纹
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'UPDATE_BUILDER') {
    let fingerprints = serverFingerprints.get(sender.tab.id);
    if (!fingerprints) {
      fingerprints = {
        server: [],
        serverComponents: [],
        technology: [],
        security: [],
        analytics: [],
        builder: [],
        framework: [],
        os: []
      };
      serverFingerprints.set(sender.tab.id, fingerprints);
    }
    if(!fingerprints.builder.find(item=>item.name===request.builder.name)) fingerprints.builder.push(request.builder);
    serverFingerprints.set(sender.tab.id, fingerprints);
    return true;
  }
  if (request.type === 'GET_FINGERPRINTS') {
    const fingerprints = serverFingerprints.get(request.tabId);
    if (fingerprints) {
      sendResponse({
        server: fingerprints.server,
        serverComponents: fingerprints.serverComponents,
        technology: fingerprints.technology,
        security: fingerprints.security,
        analytics: fingerprints.analytics,
        builder: fingerprints.builder,
        framework: fingerprints.framework,
        os: fingerprints.os
      });
    } else {
      sendResponse(null);
    }
    return true;
  }
  if (request.type === 'FETCH_JS') {
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
    return true; 
  } else if (request.type === 'UPDATE_BADGE') {
    updateBadge(request.results);
  }
});