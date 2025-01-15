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
    'mklab.cn',
    'cnnvd.org.cn'
  ],

  // API 相关配置
  API: {
    PATTERN: /['"`](?:\/|\.\.\/|\.\/)[^\/\>\< \)\(\}\,\'\"\\](?:[^\^\>\< \)\(\{\}\,\'\"\\])*?['"`]|['"`][a-zA_Z0-9]+(?<!text|application)\/(?:[^\^\>\< \)\(\{\}\,\'\"\\])*?["'`]/g,
    // 音频图片模式
    IMAGE_PATTERN: /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|mp3)(?:\?[^'"]*)?$/i,
    // JS文件模式
    JS_PATTERN: /\.(js|jsx|ts|tsx)(?:\?[^'"]*)?$/i,
    // 文档文件模式
    DOC_PATTERN: /\.(pdf|doc|docx|xls|xlsx|ppt|exe|apk|pptx|txt|md|csv)(?:\?[^'"]*)?$/i,
    // 需要跳过的第三方JS库
    SKIP_JS_FILES: [
      'layui.js',
      'layui.min.js',
      'layui.all.js',
      'layui.all.min.js',
      'jquery.js',
      'jquery.min.js',
      'vue.js',
      'vue.min.js',
      'react.js',
      'react.min.js',
      'bootstrap.js',
      'bootstrap.min.js',
      'chart.js',
      'chart.min.js',
      'jquery.cookie.js',
      'jquery.cookie.min.js',
      'browser.min.js',
      'polyfill.min.js',
      'jqgrid.min.js',
      'layer.min.js',
      'wdatepicker.js',
      'ext-base.js',
      'ext-all.js',
      'seajs-text.js',
      'seajs-style.js',
      'zh-cn.js'
    ],
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
      'image/heic',

      //文本类型
      'text/yaml',
      'text/markdown',
      'text/plain',
      'text/csv',
      'text/html',
      'text/xml',
      'text/css',
      'text/javascript',
      'text/json',
      'text/x-yaml',
      'text/tab-separated-values',
      'text/tab-separated-values',
      //音频类型
      'audio/mpeg',
      'audio/mp3',
      'video/mp4',
      'video/x-msvideo',
      'video/x-matroska',
      'video/x-ms-asf',
      'video/quicktime',

      'application/msword',
      'application/vnd.ms-word.document.macroenabled.12',
      'application/vnd.ms-word.template.macroenabled.12',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
      'application/vnd.ms-excel',
      'application/vnd.ms-excel.sheet.macroenabled.12',
      'application/vnd.ms-excel.template.macroenabled.12',
      'application/vnd.ms-excel.addin.macroenabled.12',
      'application/vnd.ms-excel.sheet.binary.macroenabled.12',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
      'application/x-xliff+xml',
      'application/pdf',
      'application/zip',
      'application/x-7z-compressed',
      'application/x-rar-compressed',
      'application/x-tar',
      'application/x-gzip',
      'application/x-bzip2',
      'application/x-xz',
      'application/x-zstd',
      'application/x-apple-diskimage',
      'application/gzip',

      'attributors/attribute/direction',
      'attributors/class/align',
      'attributors/class/background',
      'attributors/class/color',
      'attributors/class/direction',
      'attributors/class/font',
      'attributors/class/size',
      'attributors/style/align',
      'attributors/style/background',
      'attributors/style/color',
      'attributors/style/direction',
      'attributors/style/font',
      'attributors/style/size',
      'attributors/style/text-align',
      'attributors/style/text-decoration',
      'attributors/style/text-transform',
      'attributors/style/white-space',
      'attributors/style/word-break',
      'attributors/style/word-spacing',
      'attributors/style/writing-mode',

      'formats/align',
      'formats/background',
      'formats/color',
      'formats/direction',
      'formats/font',
      'formats/size',
      'formats/text-align',
      'formats/indent',
      'formats/blockquote',
      'formats/code-block',
      'formats/header',
      'formats/list',
      'formats/bold',
      'formats/code',
      'formats/italic',
      'formats/link',
      'formats/script',
      'formats/strike',
      'formats/underline',
      'formats/image',
      'formats/video',
      'formats/list/item',

      'modules/formula',
      'modules/syntax',
      'modules/toolbar',
      'themes/bubble',
      'themes/snow',
      'ui/icons',
      'ui/picker',
      'ui/icon-picker',
      'ui/color-picker',
      'ui/tooltip',

      //日期类型
      'yyyy/mm/dd',
      'm/d/Y',
      'm/d/y',

      'jpg/jpeg/png/pdf',

      //数据类型
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