// 页面切换功能
function switchPage(pageName) {
  // 更新导航标签状态
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.page === pageName);
  });
  
  // 更新页面显示状态
  document.querySelectorAll('.page').forEach(page => {
    const isScanner = page.classList.contains('scanner-page');
    const isConfig = page.classList.contains('config-page');
    
    if ((isScanner && pageName === 'scanner') || (isConfig && pageName === 'config')) {
      page.classList.add('active');
    } else {
      page.classList.remove('active');
    }
  });
  
  // 如果切换到配置页面，加载配置
  if (pageName === 'config') {
    displayConfig();
  }
}

// 显示配置信息
function displayConfig() {
  const configContainer = document.querySelector('.config-container');
  configContainer.innerHTML = '<div class="loading">加载配置中...</div>';
  
  // 获取当前标签页
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      // 向content script发送消息获取配置
      chrome.tabs.sendMessage(tabs[0].id, {type: 'GET_CONFIG'}, response => {
        if (response && response.config) {
          const config = response.config;
          
          // 构建配置页面内容
          let html = '';
          
          // API 配置
          html += `
            <div class="config-section">
              <h4>API 路径匹配</h4>
              <div class="config-item">${config.API.PATTERN}</div>
            </div>
          `;
          
          // 域名配置
          html += `
            <div class="config-section">
              <h4>域名匹配</h4>
              <div class="config-item">${config.PATTERNS.DOMAIN}</div>
            </div>
          `;
          
          // IP 配置
          html += `
            <div class="config-section">
              <h4>IP 地址匹配</h4>
              <div class="config-item">${config.PATTERNS.IP}</div>
            </div>
          `;
          
          // 其他敏感信息匹配
          html += `
            <div class="config-section">
              <h4>手机号码匹配</h4>
              <div class="config-item">${config.PATTERNS.PHONE}</div>
            </div>
            
            <div class="config-section">
              <h4>邮箱匹配</h4>
              <div class="config-item">${config.PATTERNS.EMAIL}</div>
            </div>
            
            <div class="config-section">
              <h4>身份证号匹配</h4>
              <div class="config-item">${config.PATTERNS.IDCARD}</div>
            </div>
            
            <div class="config-section">
              <h4>URL 匹配</h4>
              <div class="config-item">${config.PATTERNS.URL}</div>
            </div>
            
            <div class="config-section">
              <h4>JWT Token 匹配</h4>
              <div class="config-item">${config.PATTERNS.JWT}</div>
            </div>
            
            <div class="config-section">
              <h4>AWS Key 匹配</h4>
              <div class="config-item">${config.PATTERNS.AWS_KEY}</div>
            </div>
            
            <div class="config-section">
              <h4>哈希值匹配</h4>
              <div class="config-item">MD5: ${config.PATTERNS.HASH.MD5}</div>
              <div class="config-item">SHA1: ${config.PATTERNS.HASH.SHA1}</div>
              <div class="config-item">SHA256: ${config.PATTERNS.HASH.SHA256}</div>
            </div>
          `;
          
          configContainer.innerHTML = html;
        } else {
          configContainer.innerHTML = '<div class="error">无法加载配置</div>';
        }
      });
    }
  });
}

// 显示扫描结果的函数
function displayResults(results) {
  // 定义要显示的数据部分
  const sections = [
    { id: 'domain-list', data: results.domains, title: '域名' },
    { id: 'api-list', data: results.apis, title: 'API接口' },
    { id: 'ip-list', data: results.ips, title: 'IP地址' },
    { id: 'port-list', data: results.ports, title: '端口号' },
    { id: 'phone-list', data: results.phones, title: '手机号码' },
    { id: 'email-list', data: results.emails, title: '邮箱' },
    { id: 'idcard-list', data: results.idcards, title: '身份证号' },
    { id: 'url-list', data: results.urls, title: 'URL' },
    { id: 'jwt-list', data: results.jwts, title: 'JWT Token' },
    { id: 'aws-list', data: results.awsKeys, title: 'AWS Key' },
    { id: 'hash-md5-list', data: results.hashes.md5, title: 'MD5哈希' },
    { id: 'hash-sha1-list', data: results.hashes.sha1, title: 'SHA1哈希' },
    { id: 'hash-sha256-list', data: results.hashes.sha256, title: 'SHA256哈希' }
  ];

  // 获取或创建容器
  const container = document.querySelector('.container');
  
  sections.forEach(({ id, data, title }) => {
    if (data && data.length > 0) {
      // 检查section是否已存在
      let section = document.getElementById(`section-${id}`);
      if (!section) {
        // 如果section不存在，创建新的section
        section = document.createElement('div');
        section.className = 'section';
        section.id = `section-${id}`;
        section.innerHTML = `
          <div class="section-header">
            <div>
              <span class="title">${title}</span><span class="count">(${data.length})</span>
            </div>
            <button class="copy-all-btn" title="复制所有${title}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 3H4C3.45 3 3 3.45 3 4V16C3 16.55 3.45 17 4 17H16C16.55 17 17 16.55 17 16V4C17 3.45 16.55 3 16 3ZM15 15H5V5H15V15Z" fill="currentColor"/>
                <path d="M20 7H18V19H6V21C6 21.55 6.45 22 7 22H20C20.55 22 21 21.55 21 21V8C21 7.45 20.55 7 20 7Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <div class="section-content ${id}" id="${id}">
            <div class="content-wrapper"></div>
          </div>
        `;
        container.appendChild(section);

        // 添加复制所有按钮功能
        section.querySelector('.copy-all-btn').addEventListener('click', () => {
          const allText = data.join('\n');
          copyText(allText, section.querySelector('.copy-all-btn'), '已复制全部');
        });
      } else {
        // 如果section已存在，更新计数
        section.querySelector('.count').textContent = `(${data.length})`;
      }

      // 更新内容
      const contentWrapper = section.querySelector('.content-wrapper');
      const existingItems = new Set(Array.from(contentWrapper.children).map(el => el.getAttribute('data-full-text')));
      
      // 添加新项
      data.forEach(item => {
        if (!existingItems.has(item)) {
          const itemDiv = document.createElement('div');
          itemDiv.className = 'item';
          itemDiv.setAttribute('data-full-text', item);
          itemDiv.title = item;
          itemDiv.textContent = item;
          
          // 添加右键复制功能
          itemDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            copyText(item, itemDiv, '已复制');
          });
          
          contentWrapper.appendChild(itemDiv);
        }
      });
    }
  });

  // 移除loading状态
  const loading = container.querySelector('.loading');
  if (loading) {
    loading.remove();
  }
}

// 显示复制成功的提示框
function showCopyTooltip(element, text) {
  // 移除页面上可能存在的其他提示框
  document.querySelectorAll('.copy-tooltip').forEach(t => t.remove());
  
  // 创建新的提示框
  const tooltip = document.createElement('div');
  tooltip.className = 'copy-tooltip';
  tooltip.textContent = text;
  
  // 将提示框添加到 body 而不是具体元素，避免定位问题
  document.body.appendChild(tooltip);
  
  // 1秒后自动移除提示框
  setTimeout(() => {
    if (tooltip.parentNode) {
      tooltip.remove();
    }
  }, 1000);
}

// 复制文本到剪贴板
function copyText(text, element, message) {
  // 如果是复制多行内容，将文本转换为按列排列的格式
  const formattedText = Array.isArray(text) ? text.join('\n') : text;
  
  // 使用剪贴板 API 复制文本
  navigator.clipboard.writeText(formattedText).then(() => {
    // 显示复制成功提示
    showCopyTooltip(element, message);
    
    // 添加点击反馈效果
    if (element.classList.contains('item')) {
      element.style.background = '#e8f5e9';
      setTimeout(() => {
        element.style.background = '';
      }, 200);
    }
  }).catch(err => {
    // 复制失败时显示错误提示
    showCopyTooltip(element, '复制失败');
  });
}

// 页面加载完成时的初始化
document.addEventListener('DOMContentLoaded', () => {
  // 添加导航标签点击事件
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchPage(tab.dataset.page);
    });
  });

  // 初始化扫描页面
  const container = document.querySelector('.container');
  container.innerHTML = '<div class="loading">正在扫描...</div>';

  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {type: 'GET_RESULTS'}, response => {
        if (chrome.runtime.lastError) {
          container.innerHTML = '<div class="error">无法连接到页面</div>';
        } else if (response) {
          displayResults(response);
        }
      });
    }
  });

  window.addEventListener('resize', handleLongText);
});

// 刷新按钮点击事件处理
document.querySelector('.refresh-btn').addEventListener('click', () => {
  const container = document.querySelector('.container');
  // 显示加载状态
  container.innerHTML = '<div class="loading">正在扫描...</div>';

  // 触发重新扫描
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {type: 'REFRESH_SCAN'}, response => {
        if (response) {
          displayResults(response);
        }
      });
    }
  });
});

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SCAN_UPDATE' && message.results) {
    displayResults(message.results);
  }
});

// 处理长文本的显示
function handleLongText() {
  const items = document.querySelectorAll('.item');
  items.forEach(item => {
    // 检查内容是否被截断
    if (item.offsetWidth < item.scrollWidth) {
      item.classList.add('truncated');
    }
  });
} 