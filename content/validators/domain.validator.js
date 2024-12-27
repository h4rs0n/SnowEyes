const domainValidator = (function() {
  return {
    // 验证域名是否具有有效的顶级域名
    isValidTLD(domain) {
      return DOMAIN_CONFIG.ALLOWED_TLDS.some(tld => {
        const suffix = `.${tld}`;
        // 检查域名是否以允许的顶级域名结尾，且位置正确
        return domain.endsWith(suffix) && 
               domain.indexOf(suffix) === domain.length - suffix.length;
      });
    },
    
    // 检查域名是否在黑名单中
    isNotBlacklisted(domain) {
      return !DOMAIN_CONFIG.BLACKLIST.some(item => domain.includes(item));
    },
    
    // 检查是否是特殊域名（如 org.cn）
    isSpecialDomain(domain) {
      return DOMAIN_CONFIG.SPECIAL_DOMAINS.some(special => domain.endsWith(special));
    },

    // 验证域名的基本格式是否正确
    // 域名必须以字母数字开头和结尾，中间可以包含连字符
    // 增加了更严格的格式验证
    hasValidFormat(domain) {
      // 基本格式验证
      if (!/^[a-z0-9][-a-z0-9.]*[a-z0-9]\.[a-z0-9][-a-z0-9.]*[a-z0-9]$/i.test(domain)) {
        return false;
      }
      
      // 检查是否包含连续的点或连字符
      if (/[.-]{2,}/.test(domain)) {
        return false;
      }
      
      // 检查每个部分的长度（不能超过63个字符）
      const parts = domain.split('.');
      if (parts.some(part => part.length > 63)) {
        return false;
      }
      
      // 检查总长度（不能超过253个字符）
      if (domain.length > 253) {
        return false;
      }
      
      return true;
    }
  };
})();

// 将验证器暴露到全局作用域
window.domainValidator = domainValidator; 