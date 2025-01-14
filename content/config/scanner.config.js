// 统一的扫描器配置
const SCANNER_CONFIG = {
  // 白名单配置
  WHITELIST: [
    'github.com',
    '360.net',
    'bing.com',
    'csdn.net',
    'bilibili.com',
    'google.com',
    'youtube.com',
    'microsoft.com',
    'apple.com',
    'mozilla.org',
    'aliyun.com',
    'mklab.cn'
  ],

  // API 相关配置
  API: {
    PATTERN: /['"`](?:\/|\.\.\/|\.\/)[^\/\>\< \)\(\}\,\'\"\\](?:[^\^\>\< \)\(\{\}\,\'\"\\])*?['"`]|['"`][a-zA_Z0-9]+(?<!text|application)\/(?:[^\^\>\< \)\(\{\}\,\'\"\\])*?["'`]/g,
    // 静态文件后缀 - 增强匹配规则
    STATIC_FILE_PATTERN: /\.(js|css|ico|png|webp|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|map|json|jsonp)(?:\?[^'"]*)?$/i,
    // 需要过滤的内容类型
    FILTERED_CONTENT_TYPES: [
      // 图片类型
      'image/jpeg',
      'image/gif',
      'image/bmp',
      'image/png',
      'image/x-png',
      'image/webp',
      'image/svg+xml',
      'image/x-emf',
      'image/x-wmf',
      'image/x-icon',
      'image/tiff',

      'multipart/form-data',
    ]
  },

  // 域名相关配置
  DOMAIN: {
    // 域名黑名单
    BLACKLIST: [
      // 系统和测试域名
      'localhost',
      '.local',
      '.example',
      '.test',
      '.invalid',
      '.internal',
      
      // JavaScript 关键字和内置对象
      'this',
      'window',
      'document',
      'function',
      'class',
      'object',
      'array',
      'string',
      'number',
      'boolean',
      'undefined',
      'null',
      'error',
      'promise',
      'async',
      'await',
      'console',
      
      // DOM 相关
      'element',
      'node',
      'event',
      'style',
      'attribute',
      'prototype',
      'constructor',
      'bottom',
      'row',
      'userinfo',

      // 常见方法名
      'show',
      'hide',
      'toggle',
      'click',
      'submit',
      'load',
      'unload',
      'change',
      'update',
      'create',
      'delete',
      'remove',
      'add',
      'get',
      'set',
      'init',
      'start',
      'stop',
      'pause',
      'resume',
      'praser',
      'prasedurl',
      'location',
      'return',
      'window',

      // 常见属性名
      'name',
      'value',
      'type',
      'data',
      'text',
      'html',
      'content',
      'length',
      'size',
      'index',
      'key',
      'item',
      'parent',
      'child',
      
      // 常见变量名
      'temp',
      'tmp',
      'var',
      'obj',
      'arr',
      'str',
      'num',
      'bool',
      'func',
      'callback',
      'handler',
      'listener',
      'options',
      'config',
      'settings',
      'params',
      'args',
      'result',
      'response',
      'request',
      'error',
      'debug',
      'log'
    ],

    // 特殊域名后缀
    SPECIAL_DOMAINS: [
      'org.cn'
    ]
  },

  // IP 相关配置
  IP: {
    // 特殊 IP 范围（保留地址和特殊用途地址）
    SPECIAL_RANGES: [
      /^0\.0\.0\.0$/,          // 当前网络
      /^255\.255\.255\.255$/   // 广播地址
    ]
  },

  // 正则表达式模式
  PATTERNS: {
    // 域名匹配
    DOMAIN: /\b(?:[a-zA-Z0-9%-]+\.)+(?:wang|club|xyz|vip|top|beer|work|ren|technology|fashion|luxe|yoga|red|love|online|ltd|chat|group|pub|run|city|live|kim|pet|space|site|tech|host|fun|store|pink|ski|design|ink|wiki|video|email|company|plus|center|cool|fund|gold|guru|life|show|team|today|world|zone|social|bio|black|blue|green|lotto|organic|poker|promo|vote|archi|voto|fit|cn|website|press|icu|art|law|shop|band|media|cab|cash|cafe|games|link|fan|net|cc|com|fans|cloud|info|pro|mobi|asia|studio|biz|vin|news|fyi|tax|tv|market|shopping|mba|sale|co|org\.cn)(?![a-zA-Z0-9._=>\(\);!}-])\b/g,
    
    // IP 地址匹配
    IP: /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?\b/g,
    
    // API 路径匹配 - 使用 API.PATTERN
    get API() {
      return SCANNER_CONFIG.API.PATTERN;
    },
    
    // 其他敏感信息匹配
    PHONE: /(?<!\d|\.)(?:13[0-9]|14[01456879]|15[0-35-9]|16[2567]|17[0-8]|18[0-9]|19[0-35-9]|198|199)\d{8}(?!\d)/g,
    EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?/g,
    IDCARD: /((\d{8}(0\d|10|11|12)([0-2]\d|30|31)\d{3}$)|(\d{6}(18|19|20)\d{2}(0[1-9]|10|11|12)([0-2]\d|30|31)\d{3}(\d|X|x)))/g,
    URL: /(?:https?|wss?|ftp):\/\/(?:(?:[\w-]+\.)+[a-z]{2,}|(?:\d{1,3}\.){3}\d{1,3})(?::\d{2,5})?(?:\/[^\s'"]*)?/gi,
    JWT: /(?:ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}|ey[A-Za-z0-9_\/+-]{10,}\.[A-Za-z0-9._\/+-]{10,})/g,
    AWS_KEY: /AKIA[0-9A-Z]{16}/g,
    HASH: {
      MD5: /[a-f0-9]{32}/gi,
      SHA1: /[a-f0-9]{40}/gi,
      SHA256: /[a-f0-9]{64}/gi
    }
  }
};

// 导出配置
window.SCANNER_CONFIG = SCANNER_CONFIG;
window.API_CONFIG = SCANNER_CONFIG.API;
window.DOMAIN_CONFIG = SCANNER_CONFIG.DOMAIN;
window.IP_CONFIG = SCANNER_CONFIG.IP; 