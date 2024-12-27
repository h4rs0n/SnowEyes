const apiValidator = (function() {
  return {
    isNotFullUrl(path) {
      return !/^(?:https?:)?\/\/[^\/]+/.test(path);
    },

    isNotStaticResource(path) {
      return !API_CONFIG.STATIC_PATTERNS.some(pattern => pattern.test(path));
    },

    isValidPath(path) {
      return path.length >= 3 && 
             path.length <= 300 && 
             /^\/[\w\-\.\/\@]+/.test(path);
    }
  };
})();

window.apiValidator = apiValidator; 