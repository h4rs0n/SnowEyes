// API 相关配置
const API_CONFIG = (function() {
  return {
    // API 路径匹配模式
    PATTERNS: [
      // 1. 标准 API 路径模式
      '(?:\\/|^)api(?:\\/[\\w\\-\\.]+)*\\/?$',          // 匹配标准 API 路径
      '(?:\\/|^)apis?-[\\w\\-\\.]+\\/?$',               // 匹配带连字符的 API 路径
      '(?:\\/|^)(?:open-)?apis?(?:\\/[\\w\\-\\.]+)*\\/?$', // 匹配开放 API 路径
      
      // 2. API 版本路径模式
      '(?:\\/|^)v(?:er|ersion)?[0-9](?:\\/[\\w\\-\\.]+)+\\/?$',  // 版本号路径
      '(?:\\/|^)apis?\\/v[0-9](?:\\/[\\w\\-\\.]+)+\\/?$',        // API版本路径
      
      // 3. REST 风格路径模式
      '(?:\\/|^)rest(?:\\/[\\w\\-\\.]+)+\\/?$',         // REST API 路径
      '(?:\\/|^)graphi?ql\\/?$',                        // GraphQL 端点
      
      // 4. 服务网关路径模式
      '(?:\\/|^)gateway(?:\\/[\\w\\-\\.]+)+\\/?$',      // 网关路径
      '(?:\\/|^)services?(?:\\/[\\w\\-\\.]+)+\\/?$'     // 服务路径
    ],
    
    // 需要排除的路径模式
    EXCLUDE_PATHS: [
      /^\/users?(?:\/(?:profile|settings?|logout|login|register|signup|statistics))?$/i,  // 用户相关路径
      /^\/users?\/\d+\/?$/i,                            // 用户ID路径
      /^\/users?\/range\/[\w-]+\/?$/i,                  // 用户范围路径
      /\.[a-z0-9]{2,4}$/i,                             // 静态资源后缀
      /^\/(?:docs?|wiki|help|faq|about|privacy|terms)/i, // 文档和帮助页面
      /^\/(?:images?|css|js|fonts?|assets?|static|public)/i, // 静态资源目录
      /^\/v\d+\/?$/i,                                   // 纯版本号路径
      /^\/[a-f0-9]{32}$/i,                             // MD5哈希路径
      /^\/[a-zA-Z0-9]{20,}$/                           // 长随机字符串路径
    ],
    
    // 需要排除的域名关键词
    EXCLUDE_DOMAINS: [
      'google', 'facebook', 'twitter', 'doubleclick',   // 第三方服务
      'analytics', 'pagead', 'adsense', 'tracking',     // 统计和广告
      'stats', 'recaptcha', 'cdn', 'static', 'assets'   // 资源和服务
    ]
  };
})();

// 将配置暴露到全局作用域
window.API_CONFIG = API_CONFIG; 