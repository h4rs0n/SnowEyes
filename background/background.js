// 域名验证规则
const DOMAIN_RULES = {
  // 常见的误报关键词
  invalidKeywords: [
    // JavaScript 关键字和内置对象
    'prototype', 'constructor', 'function', 'object', 'array', 'string', 
    'number', 'boolean', 'error', 'date', 'regexp', 'promise', 'proxy',
    'class', 'super', 'this', 'window', 'document', 'global', 'process',
    'require', 'module', 'exports', 'define', 'import', 'export',
    'default', 'return', 'yield', 'async', 'await', 'static', 'get', 'set',
    
    // DOM 相关
    'event', 'element', 'node', 'style', 'color', 'font', 'text', 'size',
    'width', 'height', 'scroll', 'click', 'mouse', 'key', 'touch', 'focus',
    'blur', 'load', 'unload', 'ready', 'change', 'submit', 'reset', 'select',
    
    // 常见属性和方法名
    'data', 'type', 'name', 'value', 'index', 'count', 'length', 'size',
    'key', 'keys', 'item', 'items', 'list', 'array', 'map', 'set',
    'detail', 'time', 'date', 'path', 'file', 'files', 'image', 'audio',
    'video', 'media', 'source', 'target', 'parent', 'child', 'root',
    
    // UI/样式相关
    'layout', 'view', 'page', 'screen', 'display', 'hide', 'show', 'visible',
    'hidden', 'opacity', 'transform', 'transition', 'animation', 'background',
    'border', 'margin', 'padding', 'position', 'left', 'right', 'bottom',
    
    // 编程相关
    'debug', 'log', 'warn', 'error', 'trace', 'assert', 'test',
    'mock', 'stub', 'spy', 'prop', 'props', 'param', 'params', 'arg', 'args',
    'callback', 'handler', 'listener', 'observer', 'subscriber', 'publisher'
  ],

  // 有效的顶级域名
  validTLDs: [
    // 通用顶级域名
    'wang', 'club', 'xyz', 'vip', 'top', 'beer', 'work', 'ren',
    'technology', 'fashion', 'luxe', 'yoga', 'red', 'love', 'online',
    'ltd', 'chat', 'group', 'pub', 'run', 'city', 'live', 'kim',
    'pet', 'space', 'site', 'tech', 'host', 'fun', 'store', 'pink',
    'ski', 'design', 'ink', 'wiki', 'video', 'email', 'company',
    'plus', 'center', 'cool', 'fund', 'gold', 'guru', 'life', 'show',
    'team', 'today', 'world', 'zone', 'social', 'bio', 'black', 'blue',
    'green', 'lotto', 'organic', 'poker', 'promo', 'vote', 'archi',
    'voto', 'fit', 'website', 'press', 'icu', 'art', 'law', 'shop',
    'band', 'media', 'cab', 'cash', 'cafe', 'games', 'link', 'fan',
    'net', 'cc', 'fans', 'cloud', 'info', 'pro', 'mobi', 'asia',
    'studio', 'biz', 'vin', 'news', 'fyi', 'tax', 'tv', 'market',
    'shopping', 'mba', 'sale', 'co', 'org',

    // 中文顶级域名
    '中国', '企业', '我爱你', '移动', '中文网', '集团', '在线',
    '游戏', '网店', '网址', '网站', '商店', '娱乐'
  ]
};

// 域名验证函数
function isValidDomain(domain) {
  // 1. 基本格式验证
  if (!/^[a-z0-9\u4e00-\u9fa5][-a-z0-9\u4e00-\u9fa5.]*[a-z0-9\u4e00-\u9fa5](\.[a-z0-9\u4e00-\u9fa5][-a-z0-9\u4e00-\u9fa5]*[a-z0-9\u4e00-\u9fa5])*\.[a-z\u4e00-\u9fa5]{2,}$/i.test(domain)) {
    return false;
  }

  // 2. 检查是否包含无效关键词
  const parts = domain.split('.');
  if (parts.some(part => DOMAIN_RULES.invalidKeywords.includes(part.toLowerCase()))) {
    return false;
  }

  // 3. 验证顶级域名
  const tld = parts[parts.length - 1].toLowerCase();
  // 特殊处理 org.cn
  if (parts.length >= 2 && parts.slice(-2).join('.') === 'org.cn') {
    return true;
  }
  if (!DOMAIN_RULES.validTLDs.includes(tld)) {
    return false;
  }

  return true;
}

// 处理跨域请求和域名验证
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.text();
    })
    .then(content => {
      // 提取并验证域名
      const domains = new Set();
      const patterns = [
        // URL 格式（必须有协议或双斜杠开头）
        /(?:https?:\/\/|\/\/)([a-z0-9][-a-z0-9.]*\.[a-z0-9][-a-z0-9.]+[a-z])/gi,
        
        // 引号包裹的域名（必须是完整的字符串）
        /['"`](?:https?:\/\/)?([a-z0-9][-a-z0-9.]*\.[a-z0-9][-a-z0-9.]+[a-z])['"`](?:\s*[,}\]]|$)/gi,
        
        // 配置属性中的域名
        /(?:url|domain|host|origin|href|src|endpoint|api|baseUrl|cdn)\s*[:=]\s*['"`]([a-z0-9][-a-z0-9.]*\.[a-z0-9][-a-z0-9.]+[a-z])['"`]/gi
      ];

      patterns.forEach(pattern => {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          let domain = match[1] || match[0];
          domain = domain
            .replace(/^['"`]+|['"`]+$/g, '')
            .replace(/^\/+|\/+$/g, '')
            .toLowerCase();
          
          domain = domain.split('/')[0].split('?')[0].split('#')[0];
          
          if (isValidDomain(domain)) {
            domains.add(domain);
            if (domain.startsWith('www.')) {
              domains.add(domain.substring(4));
            } else {
              domains.add('www.' + domain);
            }
          }
        }
      });

      sendResponse({ 
        content,
        domains: Array.from(domains)
      });
    })
    .catch(error => {
      console.warn(`获取JS文件失败: ${request.url}`, error);
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
            sendResponse({ content: results[0].result, domains: [] });
          } else {
            sendResponse({ content: null, domains: [] });
          }
        })
        .catch(() => {
          sendResponse({ content: null, domains: [] });
        });
      } else {
        sendResponse({ content: null, domains: [] });
      }
    });

    return true; // 保持消息通道打开
  }
}); 