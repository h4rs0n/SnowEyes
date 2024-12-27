const apiFilter = (function() {
  return function(match, resultsSet) {
    if (match.startsWith('//')) {
      try {
        const url = new URL(`http:${match}`);
        if (API_CONFIG.EXCLUDE_DOMAINS.some(domain => url.hostname.includes(domain))) {
          return false;
        }
        match = url.pathname + url.search;
      } catch (e) {
        return false;
      }
    }

    // ... 其他过滤逻辑
    return true;
  };
})();

window.apiFilter = apiFilter; 