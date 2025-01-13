// 页面切换功能
function switchPage(pageName) {
  // 更新导航标签状态
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.page === pageName);
  });
  
  // 更新页面显示状态
  document.querySelectorAll('.page').forEach(page => {
    if (page.classList.contains(`${pageName}-page`)) {
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
  const container = document.querySelector('.config-page .container');
  container.innerHTML = '<div class="loading">加载配置中...</div>';

  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {type: 'GET_CONFIG'}, response => {
        if (chrome.runtime.lastError) {
          container.innerHTML = '<div class="error">无法获取配置信息</div>';
          return;
        }
        
        const { config } = response;
        if (!config) {
          container.innerHTML = '<div class="error">配置信息为空</div>';
          return;
        }

        // 构建配置展示HTML
        let html = '<div class="config-section">';
        
        // 添加白名单展示
        html += `
          <div class="config-group">
            <h3>白名单域名</h3>
            <div class="config-content whitelist">
              ${config.WHITELIST.map(domain => `<div class="whitelist-item">${domain}</div>`).join('')}
            </div>
          </div>
        `;
        
        // API 配置展示
        html += `
          <div class="config-group">
            <h3>API 配置</h3>
            <div class="config-content">
              <div class="config-item">
                <div class="config-label">路径匹配模式：</div>
                <div class="config-value">${config.API.PATTERN}</div>
              </div>
              <div class="config-item">
                <div class="config-label">静态文件模式：</div>
                <div class="config-value">${config.API.STATIC_FILE_PATTERN}</div>
              </div>
            </div>
          </div>
        `;

        // 域名配置展示
        html += `
          <div class="config-group">
            <h3>域名配置</h3>
            <div class="config-content">
              <div class="config-item">
                <div class="config-label">黑名单：</div>
                <div class="config-value blacklist">
                  ${config.DOMAIN.BLACKLIST.map(domain => `<div class="blacklist-item">${domain}</div>`).join('')}
                </div>
              </div>
              <div class="config-item">
                <div class="config-label">特殊域名：</div>
                <div class="config-value">${config.DOMAIN.SPECIAL_DOMAINS.join(', ')}</div>
              </div>
            </div>
          </div>
        `;

        // IP 配置展示
        html += `
          <div class="config-group">
            <h3>IP 配置</h3>
            <div class="config-content">
              <div class="config-item">
                <div class="config-label">内网 IP 范围：</div>
                <div class="config-value">${config.IP.PRIVATE_RANGES.join('<br>')}</div>
              </div>
              <div class="config-item">
                <div class="config-label">特殊 IP 范围：</div>
                <div class="config-value">${config.IP.SPECIAL_RANGES.join('<br>')}</div>
              </div>
            </div>
          </div>
        `;
        
        html += '</div>';
        container.innerHTML = html;
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
    { id: 'static-list', data: results.staticFiles, title: '静态文件' },
    { id: 'ip-list', data: results.ips, title: 'IP地址' },
    { id: 'phone-list', data: results.phones, title: '手机号码' },
    { id: 'email-list', data: results.emails, title: '邮箱' },
    { id: 'idcard-list', data: results.idcards, title: '身份证号' },
    { id: 'url-list', data: results.urls, title: 'URL' },
    { id: 'jwt-list', data: results.jwts, title: 'JWT Token' },
    { id: 'aws-list', data: results.awsKeys, title: 'AWS Key' },
    { id: 'hash-md5-list', data: results.hashes?.md5, title: 'MD5哈希' },
    { id: 'hash-sha1-list', data: results.hashes?.sha1, title: 'SHA1哈希' },
    { id: 'hash-sha256-list', data: results.hashes?.sha256, title: 'SHA256哈希' }
  ];

  // 获取容器
  const container = document.querySelector('.scanner-page .container');
  let html = '';

  // 遍历所有部分
  sections.forEach(({ id, data, title }) => {
    // 如果数据存在且不为空
    if (data && data.length > 0) {
      html += `
        <div class="section">
          <div class="section-header">
            <span class="title">${title} <span class="count">(${data.length})</span></span>
          </div>
          <div class="section-content">
            <div class="content-wrapper ${id}">
              ${Array.from(data).map(item => `
                <div class="item" title="${item}">
                  ${item}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }
  });

  // 如果没有任何结果
  if (!html) {
    html = '<div class="no-results">未发现敏感信息</div>';
  }

  // 更新容器内容
  container.innerHTML = html;

  // 处理长文本
  handleLongText();
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
  // 获取当前激活的页面
  const activePage = document.querySelector('.nav-tab.active').dataset.page;
  
  // 初始化页面显示
  document.querySelectorAll('.page').forEach(page => {
    if (page.classList.contains(`${activePage}-page`)) {
      page.classList.add('active');
    } else {
      page.classList.remove('active');
    }
  });

  // 添加导航标签点击事件
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchPage(tab.dataset.page);
    });
  });

  // 添加刷新按钮点击事件
  document.querySelector('.refresh-btn').addEventListener('click', () => {
    const container = document.querySelector('.scanner-page .container');
    container.innerHTML = '<div class="loading">正在扫描...</div>';

    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {type: 'REFRESH_SCAN'}, response => {
          if (chrome.runtime.lastError) {
            container.innerHTML = '<div class="error">无法连接到页面</div>';
          } else if (response === 'WHITELISTED') {
            container.innerHTML = '<div class="whitelisted">当前域名在白名单中，已跳过扫描</div>';
          } else if (response) {
            displayResults(response);
          }
        });
      }
    });
  });

  // 初始化扫描页面
  const container = document.querySelector('.scanner-page .container');
  container.innerHTML = '<div class="loading">正在扫描...</div>';

  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {type: 'GET_RESULTS'}, response => {
        if (chrome.runtime.lastError) {
          container.innerHTML = '<div class="error">无法连接到页面</div>';
        } else if (response === 'WHITELISTED') {
          container.innerHTML = '<div class="whitelisted">当前域名在白名单中，已跳过扫描</div>';
        } else if (response) {
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