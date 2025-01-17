// 统一的扫描过滤器
const SCANNER_FILTER = {
  // API 过滤器
  api: (function() {
    return function(match, resultsSet) {
      // 去除首尾的引号
      match = match.slice(1, -1);

      //如果是css字体文件则丢弃
      if (SCANNER_CONFIG.API.FONT_PATTERN.test(match)) {
        return true;
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
        lcMatch.includes(type.toLowerCase())
      );

      // 如果是被过滤的内容类型，直接跳过
      if (shouldFilter) {
        return true;
      }
      // 检查是否是模块路径（以./开头）
      if (match.startsWith('./')) {
        resultsSet?.moduleFiles?.add(match);
        return true;
      }

      // 区分绝对路径和相对路径
      if (match.startsWith('/')) {
        // 绝对路径
        resultsSet?.absoluteApis?.add(match);
      } else {
        // 相对路径
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
          // 1. 转小写
          domain = domain.toLowerCase();
          
          // 2. URL解码（使用缓存）
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

          // 3. 处理URL协议和引号
          domain = domain.replace(/^["']/, '').replace(/["']$/, '');
          if (domain.startsWith('http://')) {
            domain = domain.slice(7);
          } else if (domain.startsWith('https://')) {
            domain = domain.slice(8);
          } else if (domain.startsWith('//')) {
            domain = domain.slice(2);
          }
          
          // 4. 使用过滤规则提取域名
          const filterMatch = domain.match(SCANNER_CONFIG.PATTERNS.DOMAIN_FILTER);
          if (filterMatch) {
            domain = filterMatch[0];
          } else {
            return '';
          }
          
          return domain;
        } catch {
          return '';
        }
      }
    };

    return function(match, resultsSet) {
      // 清理和标准化域名
      match = validate.clean(match);
      if (!match) return false;
      
      // 添加到结果集
      resultsSet?.domains?.add(match);
      return true;
    };
  })(),

  // IP 过滤器
  ip: (function() {
    const validate = {
      format(ip) {
        const ipOnly = ip.split(':')[0];
        const parts = ipOnly.split('.');
        if (parts.length !== 4) return false;
        
        return parts.every(part => {
          const num = parseInt(part, 10);
          return !isNaN(num) && num >= 0 && num <= 255;
        });
      },

      port(ip) {
        if (!ip.includes(':')) return true;
        const port = parseInt(ip.split(':')[1], 10);
        return !isNaN(port) && port > 0 && port <= 65535;
      },

      notSpecial(ip) {
        return !SCANNER_CONFIG.IP.SPECIAL_RANGES.some(range => range.test(ip));
      }
    };

    return function(match, resultsSet) {
      if (!validate.format(match)) return false;
      if (!validate.port(match)) return false;
      if (!validate.notSpecial(match)) return false;

      // 直接添加到IP结果集中，不区分内外网
      resultsSet?.ips?.add(match);
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
          return true;
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
    
    // 如果不是当前域名或解析失败，将完整URL添加到URL结果集
    return true;
  },

  jwt: (match, resultsSet) => {
    resultsSet?.jwts?.add(match);
    return true;
  },

  aws_key: (match, resultsSet) => {
    resultsSet?.awsKeys?.add(match);
    return true;
  }
};

// 导出过滤器
window.SCANNER_FILTER = SCANNER_FILTER;
window.apiFilter = SCANNER_FILTER.api;
window.domainFilter = SCANNER_FILTER.domain;
window.ipFilter = SCANNER_FILTER.ip; 