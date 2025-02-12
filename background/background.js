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
      component: [],
      technology: [],
      security: [],
      analytics: [],
      builder: [],
      framework: [],
      os: [],
      panel: [],
      cdn: [],
      nameMap: new Map()
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

// 在标签页关闭或更新时重置指纹Map
chrome.tabs.onRemoved.addListener((tabId) => {
  Object.values(analyticsDetected).forEach(map => map.delete(tabId));
  serverFingerprints.delete(tabId);
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
function processHeaders(headers, tabId) {
  let fingerprints = serverFingerprints.get(tabId);
  if (!fingerprints) {
    fingerprints = {
      server: [],
      component: [],
      technology: [],
      security: [],
      analytics: [],
      builder: [],
      framework: [],
      os: [],
      panel: [],
      cdn: [],
      nameMap: new Map()
    };
  }
  const headerMap = new Map(
    headers.map(h => [h.name.toLowerCase(), h.value])
  );

  // 遍历所有指纹配置进行匹配
  for (const config of FINGERPRINT_CONFIG.HEADERS) {
    const headerValue = headerMap.get(config.header);
    if (headerValue) {
      const result = headerValue.match(config.pattern);
      if (result && !fingerprints.nameMap.has(config.name)) {
        var fingerprint = config;
        fingerprint['description'] = `通过${fingerprint.header}识别到网站使用${fingerprint.name}${FINGERPRINT_CONFIG.DESCRIPTIONS.find(item=>item.name===config.type)?.description}`;
        if(config.extType && !serverFingerprints.get(tabId)?.nameMap.has(config.extName)){
          var extfingerprint = {};
          extfingerprint['type'] = config.extType;
          extfingerprint['name'] = config.extName;
          extfingerprint['header'] = config.header;
          extfingerprint['description'] = `通过${extfingerprint.header}识别到网站使用${extfingerprint.name}${FINGERPRINT_CONFIG.DESCRIPTIONS.find(item=>item.name===config.extType)?.description}`;
          fingerprints[extfingerprint.type].push(extfingerprint);
          fingerprints.nameMap.set(config.extName, true);
        }
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
        fingerprints[config.type].push(fingerprint);
        fingerprints.nameMap.set(config.name, true);
      }
    }
  }
  return fingerprints;
}

// 监听器识别指纹
chrome.webRequest.onHeadersReceived.addListener(
  async (details) => {
    if (details.type !== 'main_frame' || !details.responseHeaders) return;
    
    const fingerprints = processHeaders(details.responseHeaders, details.tabId);
    serverFingerprints.set(details.tabId, fingerprints);
    
    // 获取 cookies
    chrome.cookies.getAll({ url: details.url }, (cookies) => {
      if (cookies.length > 0) {
        const cookieNames = cookies.map(cookie => cookie.name).join(';');
        const techFromCookies = identifyTechnologyFromCookie(cookieNames);
        if (techFromCookies&&!fingerprints.nameMap.has(techFromCookies.name)){
          fingerprints[techFromCookies.type].push(techFromCookies);
          fingerprints.nameMap.set(techFromCookies.name, true);
        }
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
        os: [],
        panel: [],
        cdn: [],
        nameMap: new Map()
      };
      serverFingerprints.set(sender.tab.id, fingerprints);
    }
    if(!fingerprints.nameMap.has(request.finger.name)) {
      fingerprints.nameMap.set(request.finger.name, true);  // 记录指纹名称
      fingerprints[request.finger.type].push(request.finger);
      serverFingerprints.set(sender.tab.id, fingerprints);
    }
    return true;
  }
  if (request.type === 'GET_FINGERPRINTS') {
    const fingerprints = serverFingerprints.get(request.tabId);
    if (fingerprints) {
      sendResponse({
        server: fingerprints.server,
        component: fingerprints.component,
        technology: fingerprints.technology,
        security: fingerprints.security,
        analytics: fingerprints.analytics,
        builder: fingerprints.builder,
        framework: fingerprints.framework,
        os: fingerprints.os,
        panel: fingerprints.panel,
        cdn: fingerprints.cdn
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

// 添加缓存对象
const analysisCache = {
  weight: new Map(),  
  ip: new Map(), 
  expireTime: 30 * 60 * 1000  // 缓存过期时间：30分钟
};

// 添加网站解析相关函数
async function fetchDomainWeight(domain, tabId) {
  try {
    const cachedData = analysisCache.weight.get(domain);
    if (cachedData && (Date.now() - cachedData.timestamp < analysisCache.expireTime)) {
      console.log('从缓存获取权重信息');
      return cachedData.data;
    }

    const response = await fetch(`https://api.mir6.com/api/bdqz?domain=${domain}&type=json`);
    const data = await response.json();
    if (data.code === '200') {
      analysisCache.weight.set(domain, {
        data: data,
        timestamp: Date.now(),
        tabId: tabId  // 使用传入的tabId
      });
      console.log(data);
      return data;
    }
    return null;
  } catch (error) {
    console.error('获取域名权重失败:', error);
    return null;
  }
}

async function fetchIpInfo(domain, tabId) {
  try {
    const cachedData = analysisCache.ip.get(domain);
    if (cachedData && (Date.now() - cachedData.timestamp < analysisCache.expireTime)) {
      console.log('从缓存获取IP信息');
      return cachedData.data;
    }

    const response = await fetch(`https://api.mir6.com/api/ip_json?ip=${domain}`);
    const data = await response.json();
    if (data.code === 200) {
      analysisCache.ip.set(domain, {
        data: data,
        timestamp: Date.now(),
        tabId: tabId  // 使用传入的tabId
      });
      console.log(data);
      return data;
    }
    return null;
  } catch (error) {
    console.error('获取IP信息失败:', error);
    return null;
  }
}

// 清理过期缓存的函数
function cleanExpiredCache() {
  const now = Date.now();
  for (const [domain, data] of analysisCache.weight) {
    if (now - data.timestamp >= analysisCache.expireTime) {
      analysisCache.weight.delete(domain);
    }
  }
  for (const [domain, data] of analysisCache.ip) {
    if (now - data.timestamp >= analysisCache.expireTime) {
      analysisCache.ip.delete(domain);
    }
  }
}

// 定期清理缓存（每小时）
setInterval(cleanExpiredCache, 60 * 60 * 1000);

// 添加检查缓存的函数
function getAnalysisFromCache(domain) {
  const weightData = analysisCache.weight.get(domain);
  const ipData = analysisCache.ip.get(domain);
  
  const now = Date.now();
  const weightValid = weightData && (now - weightData.timestamp < analysisCache.expireTime);
  const ipValid = ipData && (now - ipData.timestamp < analysisCache.expireTime);
  
  return {
    weight: weightValid ? weightData.data : null,
    ip: ipValid ? ipData.data : null,
    isComplete: weightValid && ipValid
  };
}

// 添加IP地址检查函数
function isPrivateIP(domain) {
  // 检查是否是IP地址
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  if (!ipv4Pattern.test(domain) && !ipv6Pattern.test(domain)) {
    return false;  // 不是IP地址
  }

  // 检查是否是内网IP
  if (ipv4Pattern.test(domain)) {
    const parts = domain.split('.');
    const firstOctet = parseInt(parts[0]);
    return (
      firstOctet === 10 || // 10.0.0.0 - 10.255.255.255
      (firstOctet === 172 && parseInt(parts[1]) >= 16 && parseInt(parts[1]) <= 31) || // 172.16.0.0 - 172.31.255.255
      (firstOctet === 192 && parseInt(parts[1]) === 168) || // 192.168.0.0 - 192.168.255.255
      domain === '127.0.0.1' // localhost
    );
  }

  // IPv6 内网地址检查
  if (ipv6Pattern.test(domain)) {
    return (
      domain.startsWith('fc00:') || // Unique Local Address
      domain.startsWith('fd00:') || // Unique Local Address
      domain.startsWith('fe80:') || // Link Local Address
      domain === '::1'             // localhost
    );
  }

  return false;
}

// 修改监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_SITE_ANALYSIS') {
    const domain = request.domain;
    
    // 检查是否是内网IP
    if (isPrivateIP(domain)) {
      sendResponse({
        weight: null,
        ip: null,
        isComplete: true,
        isPrivateIP: true
      });
      return true;
    }
    
    // 首先检查缓存
    const cachedData = getAnalysisFromCache(domain);
    if (cachedData.isComplete) {
      sendResponse(cachedData);
      return true;
    }
    
    // 如果请求来自popup，则获取完整数据
    if (sender.url && sender.url.startsWith('chrome-extension://')) {
      const tabId = sender.tab?.id;  // 获取标签页ID
      Promise.all([
        cachedData.weight || fetchDomainWeight(domain, tabId),
        cachedData.ip || fetchIpInfo(domain, tabId)
      ]).then(([weightData, ipData]) => {
        sendResponse({
          weight: weightData,
          ip: ipData
        });
      });
      return true;
    }
    
    sendResponse(cachedData);
    return true;
  }
});