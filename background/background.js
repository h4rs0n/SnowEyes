import { FINGERPRINT_CONFIG } from './config/fingerprint.config.js';
const tabCountsCache = new Map();
const tabJsMap = {}

chrome.webNavigation.onCommitted.addListener(details => {
  const { tabId, frameId } = details;
  if (frameId === 0 && tabJsMap[tabId]) {
    tabJsMap[tabId].clear();
  }
});

function setTabCount(tabId, count) {
  tabCountsCache.set(tabId, count);
  chrome.storage.session.set({ [`tab_${tabId}`]: count });
}
function getTabCount(tabId, callback) {
  if (tabCountsCache.has(tabId)) {
    callback(tabCountsCache.get(tabId));
    return;
  }
  chrome.storage.session.get(`tab_${tabId}`, (data) => {
    const count = data[`tab_${tabId}`] || 0;
    tabCountsCache.set(tabId, count);
    callback(count);
  });
}
function setBadgeUI(tabId, count) {
  const hasCount = count > 0;
  chrome.action.setBadgeText({
    text: hasCount ? String(count) : '',
    tabId
  });
  chrome.action.setBadgeBackgroundColor({
    color: hasCount ? '#4dabf7' : '#666666',
    tabId
  });
}
function updateBadge(results, tabId) {
  const fields = [
    'domains', 'absoluteApis', 'apis', 'moduleFiles', 'docFiles', 'ips', 'phones',
    'emails', 'idcards', 'jwts', 'imageFiles', 'jsFiles', 'vueFiles', 'urls',
    'githubUrls', 'companies', 'credentials', 'cookies', 'idKeys'
  ];

  const count = fields.reduce((acc, field) => {
    const arr = results[field];
    return acc + (Array.isArray(arr) && arr.length > 0 ? 1 : 0);
  }, 0);

  setTabCount(tabId, count);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs?.[0];
    if (activeTab?.id === tabId) {
      setBadgeUI(tabId, count);
    }
  });
}
chrome.tabs.onActivated.addListener(({ tabId }) => {
  getTabCount(tabId, (count) => {
    setBadgeUI(tabId, count);
  });
});
chrome.tabs.onRemoved.addListener((tabId) => {
  tabCountsCache.delete(tabId);
  chrome.storage.session.remove(`tab_${tabId}`);
  chrome.storage.session.remove(`analysis_${tabId}`)
  if(tabJsMap[tabId]){
    tabJsMap[tabId].clear();
  }
  Object.values(analyticsDetected).forEach(map => map.delete(tabId));
  serverFingerprints.delete(tabId);
});

async function tryFetchContent(url) {
  const response = await fetch(url, {
    headers: {
      'Accept': '*/*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    credentials: 'omit'
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.text();
}
async function fallbackFetchContentViaTab(tabId, url) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: (url) => {
      return fetch(url, { credentials: 'omit' }).then(res => res.text());
    },
    args: [url]
  });

  return result?.result ?? null;
}
async function handleFetchRequest(request, sender, sendResponse) {
  try {
    const content = await tryFetchContent(request.url);
    sendResponse({ content });
  } catch (error) {
    console.warn('Primary fetch failed:', error.message);

    if (sender.tab?.id) {
      try {
        const fallbackContent = await fallbackFetchContentViaTab(sender.tab.id, request.url);
        sendResponse({ content: fallbackContent });
      } catch (e2) {
        console.warn('Fallback fetch via tab failed:', e2.message);
        sendResponse({ content: null });
      }
    } else {
      sendResponse({ content: null });
    }
  }
}
let serverFingerprints = new Map();
const analyticsDetected = {
  baidu: new Map(),
  yahoo: new Map(),
  google: new Map(),
};
function handleAnalyticsDetection(details, type) {
  if (analyticsDetected[type].get(details.tabId)) {
    return;
  }

  let fingerprints = getFingerprints(details.tabId);

  analyticsDetected[type].set(details.tabId, true);
  fingerprints.analytics.push({
    name: FINGERPRINT_CONFIG.ANALYTICS[type].name,
    description: FINGERPRINT_CONFIG.ANALYTICS[type].description,
    version: FINGERPRINT_CONFIG.ANALYTICS[type].version
  });
  serverFingerprints.set(details.tabId, fingerprints);
}


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
    const { tabId, url, type } = details;
    if (type !== 'script' || tabId < 0) return;
    const initiator_url = new URL(details.initiator);
    const current_url = new URL(url);
    if (initiator_url.hostname != current_url.hostname) {
      return;
    }
    if(!tabJsMap[tabId]){
      tabJsMap[tabId] = new Set();
    }
    tabJsMap[tabId].add(url);
    return;
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
  let fingerprints = getFingerprints(tabId);
  const headerMap = new Map(
    headers.map(h => [h.name.toLowerCase(), h.value])
  );
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

function getFingerprints(tabId){
  if(serverFingerprints.has(tabId)){
    return serverFingerprints.get(tabId);
  }
  let fingerprints = {
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
  serverFingerprints.set(tabId, fingerprints);
  return fingerprints;
}
chrome.webRequest.onHeadersReceived.addListener(
  async (details) => {
    if (details.type !== 'main_frame') return { responseHeaders: details.responseHeaders };
    if (!details.responseHeaders) return { responseHeaders: details.responseHeaders };
    
    setTimeout(() => {
      const fingerprints = processHeaders(details.responseHeaders, details.tabId);
      serverFingerprints.set(details.tabId, fingerprints);
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
function performRegexMatching(chunk, patterns, patternType) {
  const matches = [];
  let maxIterations = 10000;
  
  try {
    for (const patternInfo of patterns) {
      const { pattern: patternString} = patternInfo;
      let regex;
      try {
        const match = patternString.match(/^\/(.+)\/([gimuy]*)$/);
        if (match) {
          regex = new RegExp(match[1], match[2]);
        }
      } catch (e) {
        console.error(`无效的正则表达式: ${patternString}`, e);
        continue;
      }
      let patternLastIndex = 0;
      let match;
      while ((match = regex.exec(chunk)) !== null) {
        if (regex.lastIndex <= patternLastIndex) {
          console.warn(`检测到可能的无限循环: ${patternType} Pattern - ${patternName}`);
          break;
        }
        patternLastIndex = regex.lastIndex;
        if (--maxIterations <= 0) {
          console.warn(`达到最大迭代次数: ${patternType}`);
          break;
        }
        matches.push({
          match: match[0],
        });
      }
      regex.lastIndex = 0;
    }
  } catch (e) {
    console.error(`${patternType} 匹配出错:`, e);
  }
  
  return matches;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.to !== 'background') return false;
  try {
    switch (request.type) {
      case 'UPDATE_BUILDER': {
        let fingerprints = getFingerprints(sender.tab.id);
        if (!fingerprints.nameMap.has(request.finger.name)) {
          if (request.finger.extType && !fingerprints.nameMap.has(request.finger.extName)) {
            var extfingerprint = {};
            extfingerprint['type'] = request.finger.extType;
            extfingerprint['name'] = request.finger.extName;
            extfingerprint['header'] = request.finger.name;
            extfingerprint['description'] = `通过${extfingerprint.header}识别到网站使用${extfingerprint.name}${FINGERPRINT_CONFIG.DESCRIPTIONS.find(item => item.name === request.finger.extType)?.description}`;
            fingerprints[extfingerprint.type].push(extfingerprint);
            fingerprints.nameMap.set(request.finger.extName, true);
          }
          fingerprints.nameMap.set(request.finger.name, true);
          fingerprints[request.finger.type].push(request.finger);
          serverFingerprints.set(sender.tab.id, fingerprints);
        }
        return true;
      }
      case 'GET_FINGERPRINTS': {
        const fingerprints = getFingerprints(request.tabId);
        sendResponse(fingerprints);
        return true;
      }
      case 'FETCH_JS': {
        handleFetchRequest(request, sender, sendResponse);
        return true; 
      }
      case 'REGISTER_CONTENT': {
        const tabJs = Array.from(tabJsMap[sender.tab.id] || []);
        sendResponse({ tabJs: tabJs, tabId: sender.tab.id });
        return true;
      }
      case 'UPDATE_BADGE': {
        updateBadge(request.results, request.tabId);
        return true;
      }
      case 'GET_TAB_ID': {
        sendResponse({ tabId: sender.tab?.id });
        return true;
      }
      case 'REGEX_MATCH': {
        const { chunk, patterns, patternType } = request;
        const matches = performRegexMatching(chunk, patterns, patternType);
        sendResponse({ matches });
        return true;
      }
      case 'GET_SITE_ANALYSIS': {
        const domain = getRootDomain(request.domain);
        const tabId = request.tabId;

        if (analysisPending) return true;
        analysisPending = true;
  
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
        
        getAnalysisFromStorage(tabId).then(cachedData => {
          if (cachedData.isComplete) {
            analysisPending = false;
            sendResponse(cachedData);
            return;
          }

          Promise.all([
            cachedData.weight || fetchDomainWeight(domain, tabId),
            cachedData.ip || fetchIpInfo(domain, tabId),
            cachedData.icp || fetchIcpInfo(domain, tabId)
          ]).then(([weightData, ipData, icpData]) => {
            analysisPending = false;
            saveAnalysisToStorage(tabId, weightData, ipData, icpData);
            sendResponse({
              weight: weightData?.data || null,
              ip: ipData?.data || null,
              icp: icpData?.data || null,
              isComplete: true,
              isPrivateIP: false
            });
          }).catch(error => {
            analysisPending = false;
            console.error('分析请求失败:', error);
            sendResponse(null);
          });
        });

        return true;
      }
    }
  } catch (error) {
    console.error('消息处理出错:', error);
    sendResponse(null);
    return true;
  }
});

function getAnalysisFromStorage(tabId) {
  return new Promise(resolve => {
    const key = `analysis_${tabId}`;
    chrome.storage.session.get(key, res => {
      const cache = res[key];
      if (!cache) return resolve(emptyCache());

      resolve({
        weight: cache.weight?.data || null,
        ip: cache.ip?.data || null,
        icp: cache.icp?.data || null,
        isComplete: !!(cache.weight && cache.ip && cache.icp)
      });
    });
  });
}

function saveAnalysisToStorage(tabId, weight, ip, icp) {
  const key = `analysis_${tabId}`;
  chrome.storage.session.set({
    [key]: {
      weight: weight ? { data: weight.data } : null,
      ip: ip ? { data: ip.data } : null,
      icp: icp ? { data: icp.data } : null
    }
  });
}

function emptyCache() {
  return {
    weight: null,
    ip: null,
    icp: null,
    isComplete: false
  };
}

function isPrivateIP(domain) {
  const ipv4Pattern = /^\d{1,3}(\.\d{1,3}){3}$/;
  if (ipv4Pattern.test(domain)) {
    const parts = domain.split('.');
    const first = parseInt(parts[0]), second = parseInt(parts[1]);
    return (
      first === 10 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      domain === '127.0.0.1'
    );
  }
  return false;
}

function getRootDomain(domain) {
  const specialTlds = ['com.cn', 'edu.cn', 'gov.cn', 'org.cn', 'net.cn', 'co.jp', 'co.uk', 'co.kr', 'com.hk'];
  const parts = domain.split('.');
  if (parts.length <= 2) return domain;
  for (const tld of specialTlds) {
    if (domain.endsWith(`.${tld}`)) {
      return parts.slice(-(tld.split('.').length + 1)).join('.');
    }
  }
  return parts.slice(-2).join('.');
}

async function fetchWithCache(url, tabId) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return { data };
}

async function fetchDomainWeight(domain, tabId) {
  const apiUrl = `https://api.mir6.com/api/bdqz?myKey=84fbd322b048f19626e861932ec7d572&domain=${domain}&type=json`;
  try {
    return await fetchWithCache(apiUrl, tabId);
  } catch (e) {
    console.error('域名权重查询失败:', e);
    return null;
  }
}

async function fetchIpInfo(domain, tabId) {
  const apiUrl = `https://api.mir6.com/api/ip_json?myKey=7f5860bc55587662c37cf678a7871ad0&ip=${domain}`;
  try {
    return await fetchWithCache(apiUrl, tabId);
  } catch (e) {
    console.error('IP 查询失败:', e);
    return null;
  }
}

async function fetchIcpInfo(domain, tabId) {
  const ipv4Pattern = /^\d{1,3}(\.\d{1,3}){3}$/;
  if (ipv4Pattern.test(domain)) {
    return {
      data: { icp: 'IP地址不适用', unit: 'IP地址不适用', time: 'IP地址不适用' }
    };
  }
  const apiUrl = `https://cn.apihz.cn/api/wangzhan/icp.php?id=88888888&key=88888888&domain=${domain}`;
  try {
    const icp = await fetchWithCache(apiUrl, tabId);
    if (icp?.data?.code === 404) {
      return {
        data: { icp: '未查询到备案信息', unit: '未知', time: '未知' }
      };
    }
    return icp;
  } catch (e) {
    console.error('备案查询失败:', e);
    return null;
  }
}

let analysisPending = false;
