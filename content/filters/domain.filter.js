const domainFilter = (function() {
  return function(match, resultsSet) {
    // 预处理域名：转换为小写并去除首尾空格
    match = match.toLowerCase().trim();
    
    // 移除可能的 URL 编码字符（如 %2f）
    try {
      match = decodeURIComponent(match);
    } catch (e) {
      // 如果解码失败，使用原始值
    }
    
    // 移除常见的无效字符
    match = match.replace(/['"\\\/]/g, '');
    
    // 基本格式验证
    if (!domainValidator.hasValidFormat(match)) {
      return false;
    }

    // 检查是否是特殊域名（如 org.cn）
    if (domainValidator.isSpecialDomain(match)) {
      if (resultsSet && resultsSet.domains) {
        resultsSet.domains.add(match);
      }
      return true;
    }

    // 检查域名是否在黑名单中
    if (!domainValidator.isNotBlacklisted(match)) {
      return false;
    }

    // 检查顶级域名是否有效
    if (!domainValidator.isValidTLD(match)) {
      return false;
    }

    // 将有效域名添加到结果集
    if (resultsSet && resultsSet.domains) {
      resultsSet.domains.add(match);
      // 移除自动添加 www 的逻辑
      // if (!match.startsWith('www.')) {
      //   resultsSet.domains.add('www.' + match);
      // }
    }

    return true;
  };
})();

// 将过滤器暴露到全局作用域
window.domainFilter = domainFilter; 