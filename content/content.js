let dynamicScanEnabled = false; 
let deepScanEnabled = false;
let currentTabId = null;
let scanTimeout = null;
let observerInitialized = false;
let maxDepth = 3;
let tabJs = new Set();
let isWhitelisted = false;
let hostname = null;

const tree = {};
const jsQueue = [];
const queueSet = new Set();
const jsFileMap = new Map();
const inFlightSet = new Set();
const tabResults = new Map();
const MAX_CONCURRENT = 10;
const MAX_CHUNK_SIZE = 50000;

async function initSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['dynamicScan', 'deepScan', 'customWhitelist'], async (result) => {
      hostname = window.location.hostname.toLowerCase();
      dynamicScanEnabled = result.dynamicScan === true;
      deepScanEnabled = result.deepScan === true;
      isWhitelisted = result.customWhitelist?.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
      chrome.runtime.sendMessage({ type: 'REGISTER_CONTENT', from: 'content', to: 'background' }, (response) => {
        if(isWhitelisted) return;
        tabJs = response.tabJs;
        tabJs.forEach(url => {
          enqueueJsUrl(url, 'background');
        });
      });
      resolve();
    });
  });
}
const waitForDependencies = () => {
  const deps = [
    'SCANNER_CONFIG',
    'SCANNER_FILTER',
    'logger'
  ];
  return new Promise(resolve => {
    (function check() {
      deps.every(dep => window[dep]) ? resolve() : setTimeout(check, 20);
    })();
  });
};
// 获取tabId
const getTabId = () => {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: 'GET_TAB_ID', from: 'content', to: 'background'}, response => {
      currentTabId = response.tabId;
      resolve(currentTabId);
    });
  });
};
const isThirdPartyLib = (url) => {
  const fileName = url.split('/').pop()?.split('?')[0]?.toLowerCase() || '';
  return SCANNER_CONFIG.API.SKIP_JS_PATTERNS.some(pattern => pattern.test(fileName));
};
function getBasePath(url){
  const filePath = new URL(url).pathname;
  let pathArray = filePath.split('/');
  pathArray.pop();
  return pathArray.join('/')+'/';
}
function buildTree(path) {
  const parts = path.split('/').filter(Boolean);
    let current = tree;
    parts.forEach(part => {
      if (!current[part]) current[part] = {};
      current = current[part];
    });
  return tree;
}
function findFullPath(tree, target, currentPath = '') {
  for (const key in tree) {
    const nextPath = currentPath + '/' + key;
    if (key === target.split('/')[1]) {
      return nextPath;
    }
    const result = findFullPath(tree[key], target, nextPath);
    if (result) return result;
  }
  return '';
}
function enqueueJsUrl(url, source='page', basePath = '') {
  if (!queueSet.has(url) && !isThirdPartyLib(url) && !isWhitelisted) {
    const fileName = url.split('/').pop()?.split('?')[0];
    const filePath = new URL(url).pathname;
    const fileBasePath = getBasePath(url);
    const existFilePath = jsFileMap.get(fileName);
    if(source === 'page' && deepScanEnabled){
      if(existFilePath && existFilePath.includes(filePath)){
        return;
      }
      if(!existFilePath && basePath){
        let fullPathParts = findFullPath(tree, fileBasePath)?.split('/');
        if (fullPathParts) {
          fullPathParts.pop();
          let fullPath = fullPathParts.join('/')+fileBasePath;
          url = url.replace(fileBasePath, fullPath);
        }
      }
    }
    buildTree(fileBasePath);
    jsFileMap.set(fileName, filePath);
    queueSet.add(url);
    jsQueue.push(url);
    processJsQueue();
  }
}
//分块处理
function* splitIntoChunks(text) {
  if (text.length <= MAX_CHUNK_SIZE) {
    yield text;
    return;
  }
  const lines = text.split(/\r?\n/);
  let currentLines = [];
  let currentSize = 0;

  for (const line of lines) {
    const lineSize = line.length + 1;

    if (currentSize + lineSize > MAX_CHUNK_SIZE) {
      if (currentSize > 0) {
        yield currentLines.join('\n') + '\n';
        currentLines = [];
        currentSize = 0;
      }

      // 对超长单行进行切割
      if (line.length > MAX_CHUNK_SIZE) {
        for (let i = 0; i < line.length; i += MAX_CHUNK_SIZE) {
          yield line.slice(i, i + MAX_CHUNK_SIZE);
        }
      } else {
        currentLines.push(line);
        currentSize = lineSize;
      }
    } else {
      currentLines.push(line);
      currentSize += lineSize;
    }
  }

  if (currentLines.length > 0) {
    yield currentLines.join('\n') + '\n';
  }
}
//匹配函数
const matchPatterns = (chunk, isHtmlContent = false, url) => {
  const patterns = Object.entries(SCANNER_CONFIG.PATTERNS);
  const resultsSet = tabResults.get(currentTabId);
  let update = false;
  for (const [key, pattern] of patterns) {
    const filter = SCANNER_FILTER[key.toLowerCase()];
    if (!filter) continue;

    let match;
    let lastIndex = 0;
    let maxIterations = 10000;
    
    try {
      if (key === 'FINGER') {
        // 对每个模式进行匹配
        for (const {pattern: fingerPattern, name: fingerName, class: fingerClass, type: fingerType, description: fingerDescription, extType: fingerExtType, extName: fingerExtName} of pattern.patterns) {
          if (resultsSet.fingers.has(fingerClass)) continue;
          const matches = chunk.match(fingerPattern);
          if (matches && filter(fingerName, fingerClass, fingerType, fingerDescription, url, resultsSet, fingerExtType, fingerExtName)) {
            update = true;
          }
        }
        continue;
      }
      if (key === 'IP') {
        const ipPattern = isHtmlContent ? pattern : SCANNER_CONFIG.PATTERNS.IP_RESOURCE;
        const matches = chunk.match(ipPattern);
        if (matches) {
          matches.forEach(match => {
            if (filter(match, url, resultsSet)) {
              update = true;
            }
          });
        }
        continue;
      }
      // 域名使用不同的匹配模式
      if (key === 'DOMAIN') {
        const domainPattern = isHtmlContent ? pattern : SCANNER_CONFIG.PATTERNS.DOMAIN_RESOURCE;
        while ((match = domainPattern.exec(chunk)) !== null) {
          if (domainPattern.lastIndex <= lastIndex) {
            window.logger.warn(`检测到可能的无限循环: ${key}`);
            break;
          }
          lastIndex = domainPattern.lastIndex;
          
          if (--maxIterations <= 0) {
            window.logger.warn(`达到最大迭代次数: ${key}`);
            break;
          }
          
          if (filter(match[0], url, resultsSet)) {
            update = true;
          }
        }
        continue;
      }
      // API模式特殊处理
      if (key === 'API') {
        const apiPattern = SCANNER_CONFIG.API.PATTERN;
        apiPattern.lastIndex = 0;
        while ((match = apiPattern.exec(chunk)) !== null) {
          if (apiPattern.lastIndex <= lastIndex) {
            window.logger.warn(`检测到可能的无限循环: API Pattern`);
            break;
          }
          lastIndex = apiPattern.lastIndex;
          
          if (--maxIterations <= 0) {
            window.logger.warn(`达到最大迭代次数: API`);
            break;
          }
          if (filter(match[0], url, resultsSet)) {
              update = true;
          }
        }
        continue;
      }
      if (key === 'CREDENTIALS') {
        // 对每个模式进行匹配
        for (const {pattern: credentialsPattern} of pattern.patterns) {
          let patternLastIndex = 0;  // 每个模式独立的 lastIndex
          while ((match = credentialsPattern.exec(chunk)) !== null) {
            if (credentialsPattern.lastIndex <= patternLastIndex) {
              window.logger.warn(`检测到可能的无限循环: CREDENTIALS Pattern`);
              break;
            }
            patternLastIndex = credentialsPattern.lastIndex;
            
            if (--maxIterations <= 0) {
              window.logger.warn(`达到最大迭代次数: CREDENTIALS`);
              break;
            }
            
            if (filter(match[0], url, resultsSet)) {
              update = true;
            }
          }
          // 重置正则表达式的 lastIndex
          credentialsPattern.lastIndex = 0;
        }
        continue;
      }
      // ID_KEY模式特殊处理
      if (key === 'ID_KEY') {
        // 对每个模式进行匹配
        for (const {pattern: idKeyPattern} of pattern.patterns) {
          let patternLastIndex = 0;  // 每个模式独立的 lastIndex
          while ((match = idKeyPattern.exec(chunk)) !== null) {
            if (idKeyPattern.lastIndex <= patternLastIndex) {
              window.logger.warn(`检测到可能的无限循环: ID_KEY Pattern`);
              break;
            }
            patternLastIndex = idKeyPattern.lastIndex;
            
            if (--maxIterations <= 0) {
              window.logger.warn(`达到最大迭代次数: ID_KEY`);
              break;
            }
            
            if (filter(match[0], url, resultsSet)) {
              update = true;
            }
          }
          // 重置正则表达式的 lastIndex
          idKeyPattern.lastIndex = 0;
        }
        continue;
      }
      // 其他模式使用exec
      while ((match = pattern.exec(chunk)) !== null) {
        if (pattern.lastIndex <= lastIndex) {
          window.logger.warn(`检测到可能的无限循环: ${pattern}`);
          break;
        }
        lastIndex = pattern.lastIndex;
        
        if (--maxIterations <= 0) {
          window.logger.warn(`达到最大迭代次数: ${key}`);
          break;
        }
        
        if (filter(match[0], url, resultsSet)) {
          update = true;
        }
        if (!pattern.global) break;
      }
    } catch (e) {
      window.logger.error(`匹配${key}出错:`, e);
    }
  }
  return update;
};
// 收集页面的js
const collectJsUrls = (content) => {
  const jsUrls = new Set();
  const baseUrl = window.location.origin;
  const jsPattern = /['"](?:[^'"]+\.(?:js)(?:\?[^\s'"]*)?)['"]/g;
  const matches = Array.from(content.matchAll(jsPattern))
    .map(match => {
      const path = match[0].slice(1, -1);
      let url = null
      try {
        if (path.startsWith('http')) {
          url = path;
        } else if (path.startsWith('//')) {
          url = window.location.protocol + path;
        } else if (path.startsWith('/')) {
          url = baseUrl + path;
        } else {
          url = new URL(path, baseUrl).href;
        }
        // if (url.split('?')[0].split('/').pop()?.split('?')[0].split('.')[0].length<3) {
        //   return null;
        // }
        return url;
      } catch (e) {
        console.error('Error processing JS path:', e);
        return null;
      }
    })
    .filter(url => url !== null);

  matches.forEach(url => jsUrls.add(url));
  return jsUrls;
};
//扫描函数
async function scanSources(sources, isHtmlContent = false, url) {
  try {
    for (const source of sources) {
      if (!source) continue;
      for (const chunk of splitIntoChunks(source)) {
        let update = matchPatterns(chunk, isHtmlContent, url);
        if (update) sendUpdate();
        await new Promise(r => setTimeout(r, 0));
      }
    }
  } catch (e) {
    if (e.message !== 'Extension context invalidated.') {
      window.logger.error('扫描出错:', e);
    }
  }
}
const debounceScan = () => {
  if (scanTimeout) {
    clearTimeout(scanTimeout);
  }
  scanTimeout = setTimeout(() => {
    window.logger.info('DOM变化触发重新扫描...');
    const htmlContent = document.documentElement.innerHTML;
    if (htmlContent) {
      scanSources([htmlContent], true, document.location.href);
    }
  }, 1000); // 2秒内的变化会被合并为一次扫描
};
//监听 DOM 变化
const observer = new MutationObserver((mutations) => {
  if (!dynamicScanEnabled) return;

  const significantChanges = mutations.filter(mutation => {  
    if (mutation.type === 'attributes' && (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
      return false;
    }
    
    return true;
  });
  
  if (significantChanges.length > 0) {
    debounceScan();
  }
});
// 初始化扫描
async function initScan() {
  try {
    await waitForDependencies();
    if (!currentTabId) await getTabId();

    if (!tabResults.has(currentTabId)) {
      tabResults.set(currentTabId, {
        domains: new Map(),     
        absoluteApis: new Map(),
        apis: new Map(),        
        moduleFiles: new Map(), 
        docFiles: new Map(),    
        ips: new Map(),         
        phones: new Map(),      
        emails: new Map(),      
        idcards: new Map(),     
        jwts: new Map(),        
        imageFiles: new Map(),  
        jsFiles: new Map(),     
        vueFiles: new Map(),    
        urls: new Map(),        
        githubUrls: new Map(),  
        companies: new Map(),   
        credentials: new Map(),  
        cookies: new Map(),      
        idKeys: new Map(),       
        fingers: new Map(), 
        progress: new Map()
      });
    }

    window.logger.info('开始扫描...');
    Object.keys(tabResults.get(currentTabId)).forEach(key => {
      tabResults.get(currentTabId)[key].clear();
    });
    if (isWhitelisted) return;
    const htmlContent = document.documentElement.innerHTML;
    if (htmlContent) {
      await scanSources([htmlContent], true, document.location.href);
    }

    const initialJs = collectJsUrls(htmlContent);
    initialJs.forEach(url => enqueueJsUrl(url, 'page'));
    if (!observerInitialized) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributeFilter: ['src', 'href', 'data-*'],
        characterDataOldValue: false
      });
      observerInitialized = true;
    }
  } catch (e) {
    if (e.message !== 'Extension context invalidated.') {
      window.logger.error('初始化扫描出错:', e);
    }
  }
}

// 发送更新
const sendUpdate = () => {
  try {
    const results = {};
    const total = queueSet.size;
    const remaining = jsQueue.length;
    const dealing = inFlightSet.size;
    const percent = total === 0 ? 100 : Math.floor(((total - remaining - dealing) / total) * 100);
    tabResults.get(currentTabId).progress.set('percent', percent);
    for (const key in tabResults.get(currentTabId)) {
      results[key] = Array.from(tabResults.get(currentTabId)[key]);
    }
    chrome.runtime.sendMessage({
      type: 'SCAN_UPDATE',
      from: 'content',
      to: 'popup',
      results: results,
      tabId: currentTabId,
    }).catch(() => {
      // 忽略消息发送失败的错误
    });
    
    chrome.runtime.sendMessage({
      type: 'UPDATE_BADGE',
      from: 'content',
      to: 'background',
      results: results,
      tabId: currentTabId,
    }).catch(() => {
      // 忽略消息发送失败的错误
    });
  } catch (e) {
    if (e.message !== 'Extension context invalidated.') {
      window.logger.error('发送更新出错:', e);
    }
  }
};
async function processJsQueue() {
  while (jsQueue.length > 0 && inFlightSet.size < MAX_CONCURRENT) {
    const url = jsQueue.shift();
    inFlightSet.add(url);
    
    handleJsTask(url).finally(() => {
      inFlightSet.delete(url);
      if (inFlightSet.size === 0){
        sendUpdate();
      }
      if (jsQueue.length > 0) {
        processJsQueue();
      }
    });
    await new Promise(r => setTimeout(r, 0));
  }
}

async function handleJsTask(url) {
  try {
    const response = await new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'FETCH_JS', url: url, from: 'content', to: 'background'}, resolve);
    });

    if (response?.content) {
      //扫描js
      await scanSources([response.content], false, url);
      if(deepScanEnabled){
        // 收集新的js
        const newJsUrls = collectJsUrls(response.content);
        const basePath = getBasePath(url);
        if(newJsUrls){
          newJsUrls.forEach(jsUrl => enqueueJsUrl(jsUrl, 'page', basePath));
        }
      }
    }
  } catch (e) {
    console.error('处理 JS 出错:', url, e);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    console.log('request from:', request.from);
    switch (request.type) {
      case 'GET_RESULTS': {
        const results = tabResults.get(request.tabId);
        if (!results) {
          sendResponse(null);
          break;
        }
        const normalizedResults = Object.fromEntries(
          Object.entries(results).map(([key, value]) => [key, Array.from(value)])
        );
        sendResponse(normalizedResults);
        break;
      }
      case 'UPDATE_DYNAMIC_SCAN': {
        dynamicScanEnabled = Boolean(request.enabled);
        sendResponse({ success: true });
        break;
      }
      case 'UPDATE_DEEP_SCAN': {
        deepScanEnabled = Boolean(request.enabled);
        sendResponse({ success: true });
        break;
      }
      default: {
        sendResponse(null);
      }
    }
  } catch (e) {
    if (e.message !== 'Extension context invalidated.') {
      window.logger.error('处理消息出错:', e);
    }
    sendResponse(null);
  }
  return true;
});

(async () => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      await initSettings();
      await initScan();
    });
  } else {
    await initSettings();
    await initScan();
  }
})();
