// 统一的扫描过滤器
const SCANNER_FILTER = {
  // API 过滤器
  api: (function() {
    return function(match, resultsSet) {
      // 去除首尾的引号
      match = match.slice(1, -1);

      //如果是css字体文件则丢弃
      if (SCANNER_CONFIG.API.FONT_PATTERN.test(match)) {
        return false;
      }
      
      // 检查是否是Vue文件
      if (match.endsWith('.vue')) {
        resultsSet?.vueFiles?.add(match);
        return true;
      }
      
      if (SCANNER_CONFIG.API.IMAGE_PATTERN.test(match)) {
        resultsSet?.imageFiles?.add(match);
        return true;
      }

      // 检查是否是JS文件
      if (SCANNER_CONFIG.API.JS_PATTERN.test(match)) {
        resultsSet?.jsFiles?.add(match);
        return true;
      }

      // 检查是否是文档文件
      if (SCANNER_CONFIG.API.DOC_PATTERN.test(match)) {
        resultsSet?.docFiles?.add(match);
        return true;
      }

      // 检查是否包含被过滤的内容类型
      const lcMatch = match.toLowerCase();
      const shouldFilter = SCANNER_CONFIG.API.FILTERED_CONTENT_TYPES.some(type => 
        lcMatch==type.toLowerCase()
      );

      // 如果是被过滤的内容类型，直接跳过
      if (shouldFilter) {
        return false;
      }
      // 检查是否是模块路径（以./开头）
      if (match.startsWith('./')) {
        resultsSet?.moduleFiles?.add(match);
        return true;
      }

      // 区分绝对路径和相对路径
      if (match.startsWith('/')) {
        // 绝对路径
        if(match.length<=4&&/[A-Z\.\/\#\+\?23]/.test(match.slice(1))) return false;
        resultsSet?.absoluteApis?.add(match);
      } else {
        // 相对路径
        if (/^(audio|blots|core|ace|icon|css|formats|image|js|modules|text|themes|ui|video|static|attributors|application)/.test(match)) return false;
        if(match.length<=4) return false;
        resultsSet?.apis?.add(match);
      }
      return true;
    };
  })(),

  // 域名过滤器
  domain: (function() {
    // URL解码缓存
    const decodeCache = new Map();
    
    const validate = {
      // 清理和标准化域名
      clean(domain) {
        try {
          // 1. 处理引号
          domain = domain.replace(/^['"]|['"]$/g, '');
          // 2. 转小写
          domain = domain.toLowerCase();
          // 3. URL解码（使用缓存）
          if (decodeCache.has(domain)) {
            domain = decodeCache.get(domain);
          } else {
            try {
              const decoded = decodeURIComponent(domain.replace(/\+/g, ' '));
              decodeCache.set(domain, decoded);
              domain = decoded;
            } catch {
              decodeCache.set(domain, domain);
            }
          }
          // 4. 使用过滤规则提取域名
          const filterMatch = domain.match(SCANNER_CONFIG.PATTERNS.DOMAIN_FILTER);
          if (/\b[a-z]+\.(?:top|bottom)-[a-z]+\.top\b/.test(filterMatch[0])) return false;
          if (filterMatch && filterMatch[0].split('.')[0]!="el" && filterMatch[0].split('.')[0]!="e") {
            domain = filterMatch[0];
          } else {
            return false;
          }
          
          return domain;
        } catch {
          return false;
        }
      },

      // 检查是否在黑名单中
      notInBlacklist(domain) {
        return !SCANNER_CONFIG.DOMAIN.BLACKLIST.some(blacklisted => 
          domain.includes(blacklisted)
        );
      }
    };

    return function(match, resultsSet) {
      // 清理和标准化域名
      match = validate.clean(match);
      if (!match) return false;

      // 检查是否在黑名单中
      if (!validate.notInBlacklist(match)) {
        return false;
      }

      // 添加到结果集
      resultsSet?.domains?.add(match);
      return true;
    };
  })(),

  // IP 过滤器
  ip: (function() {
    const validate = {
      notSpecial(ip) {
        return !SCANNER_CONFIG.IP.SPECIAL_RANGES.some(range => range.test(ip));
      }
    };

    return function(match, resultsSet) {
      // 提取纯IP地址（带端口）
      match = match.replace(/^[`'"]|[`'"]$/g, '');
      const ipMatch = match.match(SCANNER_CONFIG.PATTERNS.IP);
      if (ipMatch) {
        const extractedIp = ipMatch[0];
        if (!validate.notSpecial(extractedIp)) return false;
        resultsSet?.ips?.add(extractedIp);
      }
      return true;
    };
  })(),

  // 其他敏感信息过滤器
  phone: (match, resultsSet) => {
    resultsSet?.phones?.add(match);
    return true;
  },

  email: (match, resultsSet) => {
    resultsSet?.emails?.add(match);
    return true;
  },

  idcard: (match, resultsSet) => {
    resultsSet?.idcards?.add(match);
    return true;
  },

  url: (match, resultsSet) => {
    try {
      // 检查是否是GitHub URL
      if (match.toLowerCase().includes('github.com/')) {
        resultsSet?.githubUrls?.add(match);
        return true;
      }

      resultsSet?.urls?.add(match);
      // 解析URL
      const url = new URL(match);
      const currentHost = window.location.host;
      // 检查是否是当前域名或IP
      if (url.host === currentHost) {
        // 获取路径部分
        const path = url.pathname;
      
        //如果是css字体文件则丢弃
        if (SCANNER_CONFIG.API.FONT_PATTERN.test(path)) {
          return false;
        }
        // 检查是否是图片文件
        if (SCANNER_CONFIG.API.IMAGE_PATTERN.test(path)) {
          resultsSet?.imageFiles?.add(path);
          return true;
        }
        
        // 检查是否是JS文件
        if (SCANNER_CONFIG.API.JS_PATTERN.test(path)) {
          resultsSet?.jsFiles?.add(path);
          return true;
        }
        
        // 检查是否是文档文件
        if (SCANNER_CONFIG.API.DOC_PATTERN.test(path)) {
          resultsSet?.docFiles?.add(path);
          return true;
        }
        
        // 如果不是特定类型文件，则当作API处理
        if (!path.match(/\.[a-zA-Z0-9]+$/)) {
          // 区分绝对路径和相对路径
          if (path.startsWith('/')) {
            resultsSet?.absoluteApis?.add(path);
          } else {
            resultsSet?.apis?.add(path);
          }
          return true;
        }
      }
    } catch (e) {
      console.error('Error processing URL:', e);
    }
    
    return true;
  },

  jwt: (match, resultsSet) => {
    resultsSet?.jwts?.add(match);
    return true;
  },

  aws_key: (match, resultsSet) => {
    resultsSet?.awsKeys?.add(match);
    return true;
  },

  company: (match, resultsSet) => {
    if (/请|输入|前往|整个|常用|咨询|为中心|目前|任务|推动|一家|项目|等|造价|判断|通过|为了|可以|掌握|传统/.test(match)) return false;
    resultsSet?.companies?.add(match);
    return true;
  },

  credentials: (match, resultsSet) => {
    // 检查是否是空值
    const valueMatch = match.replace(/\s+/g,'').split(/[:=]/);
    var key = valueMatch[0].replace(/['"]/g,'').toLowerCase();
    var value = valueMatch[1].replace(/['"\{\}\[\]\，\：\。\？]/g,'').toLowerCase();
    if (!value.length) {
      return false; 
    }
    if (/^coord/.test(key)||/^\/|true|false|register|signUp|name/i.test(value)||value.length<=1) return false;
    if (/^[\u4e00-\u9fa5]+$/.test(value)) return false;
    
    resultsSet?.credentials?.add(match);
    return true;
  },

  cookie: (match, resultsSet) => {
    // 检查是否是空值
    const valueMatch = match.replace(/\s+/g,'').split(/[:=]/);
    if (valueMatch[1].replace(/['"]/g,'').length<4) {
      return false;
    }
    var key = valueMatch[0].replace(/['"]/g,'').toLowerCase();
    var value = valueMatch[1].replace(/['"]/g,'').toLowerCase();
    if (!value.length||key==value) {
      return false; 
    }
    if (/^func|variable|input|true|false|newline|null|unexpected|error|data|object|brac|beare|str|self|void|num|atom|opts|token|params|result|con|text|stor|sup|pun|emp|this|key|com|ent|met|opera|pare|ident|reg|invalid/i.test(value)) return false;
    resultsSet?.cookies?.add(match);
    return true;
  },

  id_key: (match, resultsSet) => {
    if (match.match(/[:=]/)) {
      // 检查是否是空值
      const valueMatch = match.replace(/\s+/g,'').split(/[:=]/);
      var key = valueMatch[0].replace(/['"]/g,'');
      var value = valueMatch[1].replace(/['"]/g,'');
      
      // 转换为小写进行检查
      const keyLower = key.toLowerCase();
      const valueLower = value.toLowerCase();
      
      if (!value.length || keyLower === valueLower) {
        return false;
      }

      // 检查key是否在黑名单中
      // if (SCANNER_CONFIG.ID_KEY.KEY_BLACKLIST.has(keyLower)) {
      //   return false;
      // }
      for (const blackWord of SCANNER_CONFIG.ID_KEY.KEY_BLACKLIST) {
        if (keyLower.includes(blackWord)) {
          return false;
        }
      }

      // 检查value是否包含黑名单词
      for (const blackWord of SCANNER_CONFIG.ID_KEY.VALUE_BLACKLIST) {
        if (valueLower.includes(blackWord)) {
          return false;
        }
      }

      // 其他检查
      if (key === "key" && (value.length <= 8 || /\b[_a-z]+(?:[A-Z][a-z]+)+\b/.test(value))) {
        return false;
      }

      if (value.length <= 3) {
        return false;
      }
    }
    
    resultsSet?.idKeys?.add(match);
    return true;
  }
};

// 导出过滤器
window.SCANNER_FILTER = SCANNER_FILTER;
window.apiFilter = SCANNER_FILTER.api;
window.domainFilter = SCANNER_FILTER.domain;
window.ipFilter = SCANNER_FILTER.ip; 