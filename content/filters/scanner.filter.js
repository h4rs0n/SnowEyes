// 统一的扫描过滤器
const SCANNER_FILTER = {
  // API 过滤器
  api: (function() {
    return function(match, resultsSet) {
      // 去除首尾的引号
      match = match.slice(1, -1);
      
      // 检查是否是静态文件
      if (SCANNER_CONFIG.API.STATIC_FILE_PATTERN.test(match)) {
        resultsSet?.staticFiles?.add(match);
        return true;
      }

      // 尝试获取文件扩展名或内容类型标识
      let contentType = '';
      try {
        // 从URL中提取可能的内容类型标识
        const lcMatch = match.toLowerCase();
        contentType = SCANNER_CONFIG.API.FILTERED_CONTENT_TYPES.find(type => 
          lcMatch.includes(type.toLowerCase()) || 
          lcMatch.includes(type.split('/')[1])  // 匹配类型的后缀部分
        ) || '';
      } catch (e) {
        console.error('Error extracting content type:', e);
      }

      // 如果URL暗示这是一个被过滤的内容类型，将其添加到静态文件中
      if (contentType) {
        resultsSet?.staticFiles?.add(match);
      } else {
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

          // 3. 处理URL协议
          if (domain.startsWith('http://')) {
            domain = domain.slice(7);
          } else if (domain.startsWith('https://')) {
            domain = domain.slice(8);
          } else if (domain.startsWith('//')) {
            domain = domain.slice(2);
          }
          
          // 4. 如果存在路径，只保留域名部分
          const slashIndex = domain.indexOf('/');
          if (slashIndex !== -1) {
            domain = domain.slice(0, slashIndex);
          }
          
          // 5. 移除常见无关字符
          domain = domain
            .replace(/['"\\\/\(\)\[\]\{\}\s,;:：]+/g, '') // 移除标点符号和空白
            .replace(/^[\.]+|[\.]+$/g, '')               // 移除首尾的点
            .replace(/\.+/g, '.');                       // 合并多个点
          
          return domain;
        } catch {
          return '';
        }
      },

      format(domain) {
        // 过滤特殊格式的域名
        if (/^\w+\.top-\w+(?:\.\w+)*\.top$/.test(domain)) {
          return false;
        }
        
        return /^[a-z0-9][-a-z0-9.]*[a-z0-9]\.[a-z0-9][-a-z0-9.]*[a-z0-9]$/i.test(domain) &&
               !/[.-]{2,}/.test(domain) &&
               domain.split('.').every(part => part.length <= 63) &&
               domain.length <= 253;
      },

      notBlacklisted(domain) {
        return !SCANNER_CONFIG.DOMAIN.BLACKLIST.some(item => domain.includes(item));
      },

      isSpecial(domain) {
        return SCANNER_CONFIG.DOMAIN.SPECIAL_DOMAINS.some(special => domain.endsWith(special));
      }
    };

    return function(match, resultsSet) {
      // 清理和标准化域名
      match = validate.clean(match);
      if (!match) return false;
      
      // 验证格式
      if (!validate.format(match)) return false;
      
      // 检查特殊域名
      if (validate.isSpecial(match)) {
        resultsSet?.domains?.add(match);
        return true;
      }

      // 检查黑名单
      if (!validate.notBlacklisted(match)) return false;

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

      isPrivate(ip) {
        return SCANNER_CONFIG.IP.PRIVATE_RANGES.some(range => range.test(ip));
      },

      notSpecial(ip) {
        return !SCANNER_CONFIG.IP.SPECIAL_RANGES.some(range => range.test(ip));
      }
    };

    return function(match, resultsSet) {
      if (!validate.format(match)) return false;
      if (!validate.port(match)) return false;
      if (!validate.notSpecial(match)) return false;

      if (validate.isPrivate(match)) {
        resultsSet?.internalIps?.add(match);
      } else {
        resultsSet?.ips?.add(match);
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
    resultsSet?.urls?.add(match);
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

  hash: {
    md5: (match, resultsSet) => {
      resultsSet?.hashes?.md5?.add(match);
      return true;
    },
    sha1: (match, resultsSet) => {
      resultsSet?.hashes?.sha1?.add(match);
      return true;
    },
    sha256: (match, resultsSet) => {
      resultsSet?.hashes?.sha256?.add(match);
      return true;
    }
  }
};

// 导出过滤器
window.SCANNER_FILTER = SCANNER_FILTER;
window.apiFilter = SCANNER_FILTER.api;
window.domainFilter = SCANNER_FILTER.domain;
window.ipFilter = SCANNER_FILTER.ip; 