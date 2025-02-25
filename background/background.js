import { FINGERPRINT_CONFIG } from './config/fingerprint.config.js';
// 在文件开头添加一个Map来存储每个标签页的结果计数
const tabCounts = new Map();

// 修改updateBadge函数
function updateBadge(results, tabId) {
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

  // 存储该标签页的计数
  tabCounts.set(tabId, nonEmptyCategories);

  // 更新当前活动标签页的badge
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]?.id === tabId) {
      chrome.action.setBadgeText({ 
        text: nonEmptyCategories > 0 ? nonEmptyCategories.toString() : '',
        tabId: tabId
      });
      
      chrome.action.setBadgeBackgroundColor({ 
        color: nonEmptyCategories > 0 ? '#4dabf7' : '#666666',
        tabId: tabId
      });
    }
  });
}

// 添加标签页切换事件监听器
chrome.tabs.onActivated.addListener((activeInfo) => {
  const count = tabCounts.get(activeInfo.tabId);
  chrome.action.setBadgeText({ 
    text: count > 0 ? count.toString() : '',
    tabId: activeInfo.tabId
  });
  
  chrome.action.setBadgeBackgroundColor({ 
    color: count > 0 ? '#4dabf7' : '#666666',
    tabId: activeInfo.tabId
  });
});

// 添加标签页移除事件监听器
chrome.tabs.onRemoved.addListener((tabId) => {
  // 清除该标签页的数据
  tabCounts.delete(tabId);
  Object.values(analyticsDetected).forEach(map => map.delete(tabId));
  serverFingerprints.delete(tabId);
});

// 存储服务器指纹信息
let serverFingerprints = new Map();

const analyticsDetected = {
  baidu: new Map(),    
  yahoo: new Map(),    
  google: new Map(),   
};
// 统计服务检测处理函数
function handleAnalyticsDetection(details, type) {
  // 检查是否已经检测到
  if (analyticsDetected[type].get(details.tabId)) {
    return;
  }

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

  analyticsDetected[type].set(details.tabId, true);
  fingerprints.analytics.push({
    name: FINGERPRINT_CONFIG.ANALYTICS[type].name,
    description: FINGERPRINT_CONFIG.ANALYTICS[type].description,
    version: FINGERPRINT_CONFIG.ANALYTICS[type].version
  });

  // 更新存储
  serverFingerprints.set(details.tabId, fingerprints);
}

// 使用单个监听器处理所有统计服务
const analyticsPatterns = Object.entries(FINGERPRINT_CONFIG.ANALYTICS).map(([type, config]) => ({
  pattern: config.pattern,
  type: type
}));

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const matchedAnalytics = analyticsPatterns.find(item => 
      details.url.match(new RegExp(item.pattern.replace(/[*]/g, '.*')))
    );
    if (matchedAnalytics) {
      handleAnalyticsDetection(details, matchedAnalytics.type);
    }
  },
  { urls: ['<all_urls>'] },
  []
);

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

// 修改监听器的处理方式
chrome.webRequest.onHeadersReceived.addListener(
  async (details) => {
    // 只处理主文档请求，并且立即返回响应头
    if (details.type !== 'main_frame') return { responseHeaders: details.responseHeaders };
    if (!details.responseHeaders) return { responseHeaders: details.responseHeaders };
    
    // 使用setTimeout将指纹处理放到下一个事件循环
    setTimeout(() => {
      const fingerprints = processHeaders(details.responseHeaders, details.tabId);
      serverFingerprints.set(details.tabId, fingerprints);
    
      // 延迟处理cookies
      chrome.cookies.getAll({ url: details.url }, (cookies) => {
        if (cookies.length > 0) {
          const cookieNames = cookies.map(cookie => cookie.name).join(';');
          const techFromCookies = identifyTechnologyFromCookie(cookieNames);
          if (techFromCookies && !fingerprints.nameMap.has(techFromCookies.name)){
            fingerprints[techFromCookies.type].push(techFromCookies);
            fingerprints.nameMap.set(techFromCookies.name, true);
          }
        }
      });
    }, 0);

    return { responseHeaders: details.responseHeaders };
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// 监听器更新指纹
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
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
        if(request.finger.extType && !fingerprints.nameMap.has(request.finger.extName)){
          var extfingerprint = {};
          extfingerprint['type'] = request.finger.extType;
          extfingerprint['name'] = request.finger.extName;
          extfingerprint['header'] = request.finger.name;
          extfingerprint['description'] = `通过${extfingerprint.header}识别到网站使用${extfingerprint.name}${FINGERPRINT_CONFIG.DESCRIPTIONS.find(item=>item.name===request.finger.extType)?.description}`;
          fingerprints[extfingerprint.type].push(extfingerprint);
          fingerprints.nameMap.set(request.finger.extName, true);
        }
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
      updateBadge(request.results, request.tabId);
    } else if (request.type === 'GET_TAB_ID') {
      sendResponse({ tabId: sender.tab?.id });
      return true;
    } else if (request.type === 'GET_SITE_ANALYSIS') {
      const domain = request.domain;
      
      if (analysisPending) {
        return true;
      }
      analysisPending = true;

      // 检查是否是内网IP
      if (isPrivateIP(domain)) {
        analysisPending = false;
        sendResponse({
          weight: null,
          ip: null,
          icp: null,
          isComplete: true,
          isPrivateIP: true
        });
        return true;
      }
      
      // 首先检查缓存
      const cachedData = getAnalysisFromCache(domain);
      if (cachedData.isComplete) {
        analysisPending = false;
        sendResponse(cachedData);
        return true;
      }
      
      Promise.all([
        cachedData.weight || fetchDomainWeight(domain, sender.tab?.id),
        cachedData.ip || fetchIpInfo(domain, sender.tab?.id),
        cachedData.icp || fetchIcpInfo(domain, sender.tab?.id)
      ]).then(([weightData, ipData, icpData]) => {
        analysisPending = false;
        sendResponse({
          weight: weightData,
          ip: ipData,
          icp: icpData
        });
      }).catch(error => {
        analysisPending = false;
        sendResponse(null);
      });
      
      return true;
    }
  } catch (error) {
    console.error('消息处理出错:', error);
    sendResponse(null);
    return true;
  }
});

// 创建通用缓存实例
const createCache = (expireTime = 30 * 60 * 1000) => ({
  cache: new Map(),
  get(key) {
    const entry = this.cache.get(key);
    return entry && Date.now() - entry.timestamp < expireTime ? entry.data : null;
  },
  set(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
});

// 初始化各模块缓存
const caches = {
  weight: createCache(),
  ip: createCache(),
  icp: createCache()
};

async function fetchWithCache(url, cacheInstance, tabId) {
  try {
    const cached = cacheInstance.get(url);
    if (cached) {
      return cached;
    }

    console.log('发起新请求:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP错误! 状态码: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.code == 200 || data.code == 404) {
      // 统一缓存数据结构
      const cacheData = {
        data: data,
        timestamp: Date.now()
      };
      cacheInstance.set(url, cacheData);
      return cacheData;
    }
    console.error('API返回异常:', data);
    return null;
  } catch (error) {
    console.error(`请求失败: ${url}`, error);
    return null;
  }
}

// 获取根域名的函数
function getRootDomain(domain) {

  const commonTlds = [
    'com.cn', 'org.cn', 'net.cn', 'gov.cn', 
    'co.jp', 'co.uk', 'co.kr', 'com.hk'
  ];

  // 分割域名
  const parts = domain.split('.');
  if (parts.length <= 2) {
    return domain; // 已经是根域名
  }

  // 检查是否包含特殊的顶级域名后缀
  for (const tld of commonTlds) {
    const tldParts = tld.split('.');
    if (domain.endsWith('.' + tld)) {
      return parts.slice(-(tldParts.length + 1)).join('.');
    }
  }

  // 默认返回最后两部分
  return parts.slice(-2).join('.');
}

// 修改网站解析相关函数中的域名处理
async function fetchDomainWeight(domain, tabId) {
  try {
    const apiUrl = `https://api.mir6.com/api/bdqz?domain=${encodeURIComponent(domain)}&type=json`;
    const weightData = await fetchWithCache(
      apiUrl,
      caches.weight,  
      tabId
    );
    
    if (weightData) {
      return weightData;
    }
    return null;
  } catch (error) {
    console.error('获取域名权重失败:', error);
    return null;
  }
}

async function fetchIpInfo(domain, tabId) {
  try {
    const ipData = await fetchWithCache(
      `https://api.mir6.com/api/ip_json?ip=${domain}`,
      caches.ip,
      tabId
    );
    if (ipData) {
      return ipData;
    }
    return null;
  } catch (error) {
    console.error('获取IP信息失败:', error);
    return null;
  }
}

// 添加检查缓存的函数
function getAnalysisFromCache(domain) {
  const weightData = caches.weight.get(domain);
  const ipData = caches.ip.get(domain);
  const icpData = caches.icp.get(domain);
  
  const now = Date.now();
  // 检查数据是否存在且有效
  const weightValid = weightData?.data && weightData.timestamp && (now - weightData.timestamp < caches.weight.expireTime);
  const ipValid = ipData?.data && ipData.timestamp && (now - ipData.timestamp < caches.ip.expireTime);
  const icpValid = icpData?.data && icpData.timestamp && (now - icpData.timestamp < caches.icp.expireTime);

  return {
    weight: weightValid ? weightData.data.data : null,
    ip: ipValid ? ipData.data.data : null,
    icp: icpValid ? icpData.data.data : null,
    isComplete: weightValid && ipValid && icpValid
  };
}

// 添加IP地址检查函数
function isPrivateIP(domain) {
  // 检查是否是IP地址
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
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
  return false;
}

// 添加备案信息查询函数
async function fetchIcpInfo(domain, tabId) {
  // 如果是IP地址，直接返回不适用
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  
  if (ipv4Pattern.test(domain)) {
    return {
      data: {
        icp: 'IP地址不适用',
        unit: 'IP地址不适用',
        time: 'IP地址不适用'
      }
    };
  }
  const rootDomain = getRootDomain(domain);
  try {
    const icpData = await fetchWithCache(
      `https://cn.apihz.cn/api/wangzhan/icp.php?id=88888888&key=88888888&domain=${rootDomain}`,
      caches.icp,
      tabId
    );
    // 如果返回404，说明没有查询到备案信息
    if (icpData && icpData.code === 404) {
      return {
        data: {
          icp: '未查询到备案信息',
          unit: '未知',
          time: '未知'
        }
      };
    }
    if (icpData) {
      return icpData;
    }
    return null;
  } catch (error) {
    console.error('获取备案信息失败:', error);
    return null;
  }
}

let analysisPending = false; // 在文件顶部添加模块级变量