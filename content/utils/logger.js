// 日志工具模块
const logger = (function() {
  return {
    // 调试级别日志
    debug: (...args) => console.debug('[Scanner]', ...args),
    
    // 信息级别日志
    info: (...args) => console.info('[Scanner]', ...args),
    
    // 警告级别日志
    warn: (...args) => console.warn('[Scanner]', ...args),
    
    // 错误级别日志
    error: (...args) => console.error('[Scanner]', ...args)
  };
})();

// 将日志工具暴露到全局作用域
window.logger = logger; 