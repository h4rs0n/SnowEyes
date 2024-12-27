const ipFilter = (function() {
  return function(match, resultsSet) {
    // 基本格式验证
    if (!ipValidator.isValidIP(match)) {
      return false;
    }

    // 检查特殊IP
    if (ipValidator.isSpecial(match)) {
      return false;
    }

    // 检查端口号
    if (!ipValidator.hasValidPort(match)) {
      return false;
    }

    // 区分内网和外网IP
    if (ipValidator.isPrivate(match)) {
      if (resultsSet && resultsSet.internalIps) {
        resultsSet.internalIps.add(match);
      }
    } else if (resultsSet && resultsSet.ips) {
      resultsSet.ips.add(match);
    }

    return true;
  };
})();

window.ipFilter = ipFilter; 