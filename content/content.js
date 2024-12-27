// 等待所有依赖模块加载完成
// 返回一个 Promise，在所有依赖都可用时 resolve
function waitForDependencies() {
  return new Promise((resolve) => {
    const check = () => {
      // 需要检查的依赖模块列表
      const dependencies = [
        'API_CONFIG',      // API 配置
        'DOMAIN_CONFIG',   // 域名配置
        'IP_CONFIG',       // IP 配置
        'apiValidator',    // API 验证器
        'domainValidator', // 域名验证器
        'ipValidator',     // IP 验证器
        'apiFilter',      // API 过滤器
        'domainFilter',   // 域名过滤器
        'ipFilter',       // IP 过滤器
        'logger'          // 日志工具
      ];

      // 检查所有依赖是否都已加载到 window 对象中
      if (dependencies.every(dep => window[dep])) {
        resolve();
      } else {
        // 如果有依赖未加载，50ms 后重试
        setTimeout(check, 50);
      }
    };
    check();
  });
}

// 存储扫描结果的集合
const latestResults = {
  domains: new Set(),     // 域名结果集
  apis: new Set(),        // API 结果集
  ips: new Set(),         // IP 地址结果集
  internalIps: new Set(), // 内网 IP 结果集
  phones: new Set(),      // 手机号结果集
  emails: new Set(),      // 邮箱结果集
  idcards: new Set(),     // 身份证号结果集
  urls: new Set(),        // URL 结果集
  btcs: new Set(),        // 比特币地址结果集
  eths: new Set(),        // 以太坊地址结果集
  jwts: new Set(),        // JWT Token 结果集
  awsKeys: new Set(),     // AWS Access Key 结果集
  hashes: {              // 哈希结果集
    md5: new Set(),
    sha1: new Set(),
    sha256: new Set()
  }
};

// 正则表达式模式集合
let patterns;

// 初始化正则表达式模式
function initPatterns() {
  patterns = {
    // 匹配域名的正则表达式
    domain: /[a-z0-9][-a-z0-9.]*\.[a-z0-9][-a-z0-9.]*[a-z0-9]/gi,
    // 匹配 API 路径的正则表达式（从配置中获取）
    api: new RegExp('(?:' + window.API_CONFIG.PATTERNS.join('|') + ')', 'gi'),
    // 匹配 IP 地址（可选带端口）的正则表达式
    ip: /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?\b/g,
    // 匹配中国大陆手机号的正则表达式
    phone: /(?:13[0-9]|14[01456879]|15[0-35-9]|16[2567]|17[0-8]|18[0-9]|19[0-35-9]|198|199)\d{8}/g,
    // 匹配电子邮箱的正则表达式
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?/g,
    // 匹配身份证号的正则表达式
    idcard: /[1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]|[1-9]\d{5}\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}/g,
    // 新增：URL匹配
    url: /https?:\/\/(?:[\w-]+\.)+[a-z]{2,}(?::\d{2,5})?(?:\/[^\s'"]*)?/gi,
    // 新增：比特币地址
    btc: /[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[ac-hj-np-z02-9]{39,59}/g,
    // 新增：以太坊地址
    eth: /0x[a-fA-F0-9]{40}/g,
    // 新增：JWT Token
    jwt: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/g,
    // 新增：AWS Access Key
    awsKey: /AKIA[0-9A-Z]{16}/g,
    // 新增：常见加密哈希
    hash: {
      md5: /[a-f0-9]{32}/gi,
      sha1: /[a-f0-9]{40}/gi,
      sha256: /[a-f0-9]{64}/gi
    }
  };
}

// 获取页面中的所有可能包含敏感信息的资源
function getAllSources() {
  const sources = [];
  try {
    // 1. 获取整个页面的 HTML 内容
    sources.push(document.documentElement.outerHTML);
    
    // 2. 获取所有内联脚本的内容
    const scripts = Array.from(document.scripts);
    scripts.forEach(script => {
      if (!script.src && script.textContent) {
        sources.push(script.textContent);
      }
    });

    // 3. 获取所有资源的 URL
    const resources = [
      ...Array.from(document.querySelectorAll('a[href]')).map(a => a.href),       // 链接
      ...Array.from(document.querySelectorAll('img[src]')).map(img => img.src),   // 图片
      ...Array.from(document.querySelectorAll('script[src]')).map(script => script.src), // 外部脚本
      ...Array.from(document.querySelectorAll('link[href]')).map(link => link.href),    // 样式表
      ...Array.from(document.querySelectorAll('iframe[src]')).map(iframe => iframe.src), // iframe
      ...Array.from(document.querySelectorAll('source[src]')).map(source => source.src)  // ��体源
    ];
    sources.push(...resources);

    // 4. 获取 HTML 注释内容
    const iterator = document.createNodeIterator(
      document.documentElement,
      NodeFilter.SHOW_COMMENT
    );
    let comment;
    while (comment = iterator.nextNode()) {
      sources.push(comment.textContent);
    }

    // 5. 获取表单和元数据内容
    // 获取文本输入框和文本区域的值
    const formElements = document.querySelectorAll('input[type="text"], textarea');
    formElements.forEach(el => {
      if (el.value) sources.push(el.value);
    });

    // 获取 meta 标签的内容
    const metas = document.querySelectorAll('meta[content]');
    metas.forEach(meta => sources.push(meta.content));

    // 6. 过滤和去重处理
    return Array.from(new Set(
      sources.filter(source => 
        source && 
        typeof source === 'string' && 
        source.trim().length > 3 && // 忽略过短的内容
        !source.startsWith('data:') && // 忽略 data URL
        !source.startsWith('blob:')    // 忽略 blob URL
      )
    ));

  } catch (e) {
    logger.error('获取资源时出错:', e);
    return sources;
  }
}

// 扫描资源内容，查找敏感信息
function scanSources(sources) {
  sources.forEach(source => {
    if (typeof source === 'string') {
      // 对每种模式���行匹配
      Object.entries(patterns).forEach(([key, pattern]) => {
        const matches = source.match(pattern) || [];
        console.log(`Found ${matches.length} potential ${key} matches in source`);
        matches.forEach(match => {
          // 获取对应的过滤器
          const filter = window[`${key}Filter`];
          if (filter) {
            const result = filter(match, latestResults);
            if (!result) {
              console.log(`Filtered out ${key} match: ${match}`);
            }
          }
        });
      });
    }
  });
}

// 初始化扫描过程
async function initScan() {
  try {
    // 等待所有依赖加载完成
    await waitForDependencies();
    // 初始化正则表达式模式
    initPatterns();
    // 记录开始扫描的日志
    window.logger.info('开始扫描...');
    // 获取所有资源
    const sources = getAllSources();
    // 执行扫描
    scanSources(sources);
  } catch (error) {
    console.error('初始化扫描失败:', error);
  }
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_RESULTS') {
    // 返回当前的扫描结果
    sendResponse(Object.fromEntries(
      Object.entries(latestResults).map(([key, value]) => [key, Array.from(value)])
    ));
  } else if (request.type === 'REFRESH_SCAN') {
    // 重新执行扫描
    initScan().then(() => {
      sendResponse(Object.fromEntries(
        Object.entries(latestResults).map(([key, value]) => [key, Array.from(value)])
      ));
    });
    return true; // 保持消息通道打开
  }
});

// 在页面加载完成后开始扫描
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScan);
} else {
  initScan();
} 