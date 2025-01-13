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
    'video', 'media', 'source', 'target', 'parent', 'child', 'root'
  ]
};

// 处理跨域请求
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
  }
}); 