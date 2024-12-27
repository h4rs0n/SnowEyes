const ipValidator = (function() {
  return {
    isValidIP(ip) {
      const ipOnly = ip.split(':')[0];
      const parts = ipOnly.split('.');
      if (parts.length !== 4) return false;
      
      return parts.every(part => {
        const num = parseInt(part, 10);
        return !isNaN(num) && num >= 0 && num <= 255;
      });
    },
    
    isPrivate(ip) {
      return IP_CONFIG.PRIVATE_RANGES.some(range => range.test(ip));
    },
    
    isSpecial(ip) {
      return IP_CONFIG.SPECIAL_RANGES.some(range => range.test(ip));
    },
    
    hasValidPort(ip) {
      if (!ip.includes(':')) return true;
      const port = parseInt(ip.split(':')[1], 10);
      return !isNaN(port) && port > 0 && port <= 65535;
    }
  };
})();

window.ipValidator = ipValidator; 