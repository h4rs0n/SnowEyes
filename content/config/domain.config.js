const DOMAIN_CONFIG = (function() {
  return {
    // 允许的顶级域名列表
    ALLOWED_TLDS: [
      // 最常见的顶级域名
      'com', 'org', 'net', 'edu', 'gov', 'mil',  // 基础通用顶级域名
      
      // 国家和地区顶级域名
      'cn', 'us', 'uk', 'jp', 'de', 'fr', 'ru',  // 主要国家代码顶级域名
      
      // 新通用顶级域名
      'wang', 'club', 'xyz', 'vip', 'top', 'beer', 'work', 'ren',
      // ...其他域名
    ],

    // 域名黑名单，用于过滤掉测试和内部域名
    BLACKLIST: [
      'localhost',    // 本地主机
      '.local',       // 本地域名
      '.example',     // 示例域名
      '.test',        // 测试域名
      '.invalid',     // 无效域名
      '.internal'     // 内部域名
    ],

    // 特殊域名后缀，需要特殊处理的域名
    SPECIAL_DOMAINS: [
      'org.cn'        // 中国组织域名
    ]
  };
})();

// 将配置暴露到全局作用域
window.DOMAIN_CONFIG = DOMAIN_CONFIG; 