// 在文件开头添加动态扫描状态变量
let dynamicScanEnabled = true;

// 在初始化时获取设置
chrome.storage.local.get(['dynamicScan'], (result) => {
  dynamicScanEnabled = result.dynamicScan !== false;
});

// 等待依赖加载 - 简化检查
const waitForDependencies = () => {
  const deps = [
    'SCANNER_CONFIG',
    'SCANNER_FILTER',
    'logger'
  ];
  return new Promise(resolve => {
    (function check() {
      deps.every(dep => window[dep]) ? resolve() : setTimeout(check, 50);
    })();
  });
};

// 存储扫描结果的集合
const latestResults = {
  domains: new Set(),     // 域名结果集
  absoluteApis: new Set(),// API 结果集（绝对路径）
  apis: new Set(),        // API 结果集（相对路径）
  moduleFiles: new Set(), // 模块路径结果集
  docFiles: new Set(),    // 文档文件结果集
  ips: new Set(),         // IP 地址结果集
  phones: new Set(),      // 手机号结果集
  emails: new Set(),      // 邮箱结果集
  idcards: new Set(),     // 身份证号结果集
  jwts: new Set(),        // JWT Token 结果集
  imageFiles: new Set(),  // 音频图片结果集
  jsFiles: new Set(),     // JS文件结果集
  vueFiles: new Set(),    // Vue 文件结果集
  urls: new Set(),        // URL 结果集
  githubUrls: new Set(),  // GitHub URL 结果集
  companies: new Set(),   // 公司机构结果集
  credentials: new Set(),  // 用户名密码结果集
  cookies: new Set(),      // Cookie结果集
  idKeys: new Set(),       // ID密钥结果集
};

// 优化扫描函数
async function scanSources(sources, isHtmlContent = false) {
  try {
    const seen = new Set();
    let lastUpdateTime = Date.now();
    const UPDATE_INTERVAL = 100; // 每100ms更新一次
    const MAX_CHUNK_SIZE = 100000; // 减小块大小到100KB
    
    // 发送更新的函数
    const sendUpdate = () => {
      try {
        const results = {};
        for (const key in latestResults) {
          results[key] = Array.from(latestResults[key]);
        }
        chrome.runtime.sendMessage({
          type: 'SCAN_UPDATE',
          results: results
        }).catch(() => {
          // 忽略消息发送失败的错误
        });
        
        chrome.runtime.sendMessage({
          type: 'UPDATE_BADGE',
          results: results
        }).catch(() => {
          // 忽略消息发送失败的错误
        });
      } catch (e) {
        // 扩展上下文失效时忽略错误
        if (e.message !== 'Extension context invalidated.') {
          window.logger.error('发送更新出错:', e);
        }
      }
    };

    // 分块处理大文本
    function* splitIntoChunks(text) {
      const length = text.length;
      let lastIndex = 0;
      
      // 使用换行符作为自然分割点
      for (let i = 0; i < length; i++) {
        if (i - lastIndex >= MAX_CHUNK_SIZE || text[i] === '\n') {
          yield text.slice(lastIndex, i);
          lastIndex = i;
        }
      }
      if (lastIndex < length) {
        yield text.slice(lastIndex);
      }
    }

    // 优化匹配函数
    const matchPatterns = (chunk, isHtmlContent = false) => {
      // 预先编译正则表达式
      const patterns = Object.entries(SCANNER_CONFIG.PATTERNS);

      // 批量处理所有模式
      for (const [key, pattern] of patterns) {
        const filter = SCANNER_FILTER[key.toLowerCase()];
        if (!filter) continue;

        let match;
        let lastIndex = 0;
        let maxIterations = 10000;
        
        try {
          // 根据内容类型选择合适的模式
          if (key === 'IP') {
            // 使用不同的IP匹配模式
            const ipPattern = isHtmlContent ? pattern : SCANNER_CONFIG.PATTERNS.IP_RESOURCE;
            const matches = chunk.match(ipPattern);
            if (matches) {
              matches.forEach(match => filter(match, latestResults));
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
              
              filter(match[0], latestResults);
            }
            continue;
          }

          // API模式特殊处理
          if (key === 'API' && pattern && typeof pattern === 'object') {
            const apiPattern = SCANNER_CONFIG.API.PATTERN;
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
              
              filter(match[0], latestResults);
            }
            continue;
          }

          // ID_KEY模式特殊处理
          if (pattern && pattern.type === 'ID_KEY') {
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
                
                filter(match[0], latestResults);
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
            
            filter(match[0], latestResults);
            if (!pattern.global) break;
          }
        } catch (e) {
          window.logger.error(`匹配${key}出错:`, e);
        }
      }
    };

    // 处理单个源
    const processSource = (source) => {
      if (!source || seen.has(source)) return;
      seen.add(source);

      try {
        // 对大文本进行分块处理
        for (const chunk of splitIntoChunks(source)) {
          matchPatterns(chunk, isHtmlContent);  // 传递 isHtmlContent 参数
          
          // 定期更新结果
          if (Date.now() - lastUpdateTime > UPDATE_INTERVAL) {
            sendUpdate();
            lastUpdateTime = Date.now();
            // 给主线程一个喘息的机会
            return new Promise(resolve => setTimeout(resolve, 0));
          }
        }
      } catch (e) {
        window.logger.error('处理源时出错:', e);
      }
    };

    // 主扫描函数
    const scan = async () => {
      for (const source of sources) {
        await processSource(source);
      }
      sendUpdate(); // 最后更新一次
    };

    // 开始扫描
    scan().catch(e => window.logger.error('扫描出错:', e));
  } catch (e) {
    // 扩展上下文失效时忽略错误
    if (e.message !== 'Extension context invalidated.') {
      window.logger.error('扫描出错:', e);
    }
  }
}

// 检查域名是否在白名单中
function isInWhitelist(hostname) {
  return SCANNER_CONFIG.DOMAIN.WHITELIST.some(domain => {
    // 完全匹配或者是子域名
    return hostname === domain || hostname.endsWith('.' + domain);
  });
}

// 初始化扫描
async function initScan() {
  try {
    await waitForDependencies();
    window.logger.info('开始扫描...');
    
    // 检查当前域名是否在白名单中
    const currentHostname = window.location.hostname.toLowerCase();
    if (isInWhitelist(currentHostname)) {
      window.logger.info('当前域名在白名单中，跳过扫描');
      return;
    }

    // 使用防抖函数来控制扫描频率
    let scanTimeout = null;
    const debounceScan = () => {
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }
      scanTimeout = setTimeout(() => {
        window.logger.info('DOM变化触发重新扫描...');
        const htmlContent = document.documentElement.innerHTML;
        if (htmlContent) {
          scanSources([htmlContent], true);
        }
      }, 1000); // 2秒内的变化会被合并为一次扫描
    };

    // 使用 MutationObserver 监听 DOM 变化
    const observer = new MutationObserver((mutations) => {
      // 如果动态扫描被禁用，直接返回
      if (!dynamicScanEnabled) return;

      // 过滤掉不重要的变化
      const significantChanges = mutations.filter(mutation => {
        // 忽略文本内容的微小变化
        if (mutation.type === 'characterData' && 
            mutation.target.textContent?.length < 50) {
          return false;
        }
        
        // 忽略class和style属性的变化
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'class' || 
             mutation.attributeName === 'style')) {
          return false;
        }
        
        return true;
      });
      
      // 只有在有重要变化时才触发扫描
      if (significantChanges.length > 0) {
        debounceScan();
      }
    });

    // 配置 observer，减少监听范围
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributeFilter: ['src', 'href', 'data-*'], // 只监听关键属性
      characterDataOldValue: false // 不记录旧值
    });

    // 清空之前的结果
    Object.keys(latestResults).forEach(key => {
      latestResults[key].clear();
    });

    window.logger.info('扫描当前页面...');
    const htmlContent = document.documentElement.innerHTML;
    if (htmlContent) {
      scanSources([htmlContent], true);
    }

    // 延迟扫描其他资源
    setTimeout(() => {
      window.logger.info('扫描其他资源...');
      collectAndScanResources();
    }, 100);

  } catch (e) {
    // 扩展上下文失效时忽略错误
    if (e.message !== 'Extension context invalidated.') {
      window.logger.error('初始化扫描出错:', e);
    }
  }
}

// 增量收集和扫描资源
async function collectAndScanResources() {
  try {
    // 检查是否是第三方库
    const isThirdPartyLib = (url) => {
      const fileName = url.split('/').pop()?.split('?')[0]?.toLowerCase() || '';
      return SCANNER_CONFIG.API.SKIP_JS_PATTERNS.some(pattern => pattern.test(fileName));
    };

    // 1. 收集并扫描关键资源的URL
    const criticalSelectors = [
      ['a[href^="http"]', 'href'],
      ['script[src]', 'src'],
      ['link[href]', 'href']
    ];

    for (const [selector, attr] of criticalSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        const urls = [];
        for (const el of elements) {
          const value = el[attr];
          if (value) urls.push(value);
        }
        if (urls.length > 0) {
          scanSources(urls);
        }
      } catch (e) {
        console.error('Error collecting resources:', e);
      }
    }

    // 2. 收集并扫描meta标签内容
    try {
      const metas = document.querySelectorAll('meta[content]');
      const contents = [];
      for (const meta of metas) {
        const content = meta.content;
        if (content) contents.push(content);
      }
      if (contents.length > 0) {
        scanSources(contents);
      }
    } catch (e) {
      console.error('Error collecting meta content:', e);
    }

    // 3. 收集并扫描数据属性
    try {
      const sensitiveDataAttrs = ['api', 'url', 'endpoint', 'server', 'config'];
      for (const attr of sensitiveDataAttrs) {
        const elements = document.querySelectorAll(`[data-${attr}]`);
        const values = [];
        for (const el of elements) {
          const value = el.dataset[attr];
          if (value) values.push(value);
        }
        if (values.length > 0) {
          scanSources(values);
        }
      }
    } catch (e) {
      console.error('Error collecting data attributes:', e);
    }

    // 4. 异步获取并扫描脚本内容
    const baseUrl = window.location.origin;
    
    // 从document.scripts获取
    const scripts = Array.from(document.scripts)
      .filter(script => script?.src && typeof script.src === 'string' && script.src.trim());
    
    // 从页面内容匹配获取
    const pageContent = document.documentElement.outerHTML;
    const jsPattern = /['"](?:[^'"]+\.(?:js)(?:\?[^\s'"]*)?)['"]/g;
    const jsMatches = Array.from(pageContent.matchAll(jsPattern))
      .map(match => {
        const path = match[0].slice(1, -1);
        try {
          if (path.startsWith('http')) {
            return path;
          } else if (path.startsWith('//')) {
            return window.location.protocol + path;
          } else if (path.startsWith('/')) {
            return baseUrl + path;
          } else {
            return new URL(path, baseUrl).href;
          }
        } catch (e) {
          console.error('Error processing JS path:', e);
          return null;
        }
      })
      .filter(url => url !== null);

    // 合并所有JS文件URL并去重
    const allJsUrls = new Set([
      ...scripts.map(script => script.src),
      ...jsMatches
    ]);

    // 并行获取脚本内容，但每个脚本获取后立即扫描
    const jsContents = new Set();
    const fetchPromises = Array.from(allJsUrls).map(async url => {
      if (jsContents.has(url)) return;
      jsContents.add(url);
      
      // 检查是否是第三方库，如果是则跳过
      if (isThirdPartyLib(url)) {
        logger.info('跳过第三方库:', url);
        return;
      }
      
      try {
        const response = await new Promise(resolve => {
          chrome.runtime.sendMessage({type: 'FETCH_JS', url: url}, resolve);
        });
        
        if (response?.content) {
          // 立即扫描获取到的脚本内容
          scanSources([response.content]);
        }
      } catch (e) {
        console.error('Error fetching script:', url, e);
      }
    });

    // 等待所有脚本获取完成
    await Promise.all(fetchPromises);
  } catch (e) {
    console.error('Error in collectAndScanResources:', e);
  }
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.type === 'GET_RESULTS') {
      // 检查是否在白名单中
      const currentHostname = window.location.hostname.toLowerCase();
      if (isInWhitelist(currentHostname)) {
        sendResponse('WHITELISTED');
        return;
      }
      // 返回当前的扫描结果
      sendResponse(Object.fromEntries(
        Object.entries(latestResults).map(([key, value]) => [key, Array.from(value)])
      ));
    } else if (request.type === 'REFRESH_SCAN') {
      // 检查是否在白名单中
      const currentHostname = window.location.hostname.toLowerCase();
      if (isInWhitelist(currentHostname)) {
        sendResponse('WHITELISTED');
        return;
      }
      // 重新执行扫描
      initScan().then(() => {
        sendResponse(Object.fromEntries(
          Object.entries(latestResults).map(([key, value]) => [key, Array.from(value)])
        ));
      });
      return true; // 保持消息通道打开
    } else if (request.type === 'GET_CONFIG') {
      // 只返回白名单配置
      sendResponse({
        config: {
          WHITELIST: SCANNER_CONFIG.DOMAIN.WHITELIST
        }
      });
    } else if (request.type === 'UPDATE_DYNAMIC_SCAN') {
      dynamicScanEnabled = request.enabled;
      sendResponse({ success: true });
    }
  } catch (e) {
    // 扩展上下文失效时忽略错误
    if (e.message !== 'Extension context invalidated.') {
      window.logger.error('处理消息出错:', e);
    }
    sendResponse(null);
  }
  return true; // 保持消息通道打开
});

// 在页面加载完成后开始扫描
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScan);
} else {
  initScan();
} 