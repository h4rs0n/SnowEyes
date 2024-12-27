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
    { id: 'btc-list', data: results.btcs, title: '比特币地址' },
    { id: 'eth-list', data: results.eths, title: '以太坊地址' },
    { id: 'jwt-list', data: results.jwts, title: 'JWT Token' },
    { id: 'aws-list', data: results.awsKeys, title: 'AWS Key' },
    { id: 'hash-md5-list', data: results.hashes.md5, title: 'MD5哈希' },
    { id: 'hash-sha1-list', data: results.hashes.sha1, title: 'SHA1哈希' },
    { id: 'hash-sha256-list', data: results.hashes.sha256, title: 'SHA256哈希' }
  ];

  // 清空容器内容
  const container = document.querySelector('.container');
  container.innerHTML = '';

  // 只显示有数据的部分
  sections.forEach(({ id, data, title }) => {
    if (data && data.length > 0) {
      // 创建每个部分的 HTML
      const section = document.createElement('div');
      section.className = 'section';
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
          <div class="content-wrapper">
            ${data.map(item => {
              const escapedItem = item.replace(/"/g, '&quot;');
              return `
                <div class="item" 
                     data-full-text="${escapedItem}" 
                     title="${escapedItem}">
                  ${item}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
      container.appendChild(section);

      // 添加右键复制功能
      section.querySelectorAll('.item').forEach(item => {
        item.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          const text = item.getAttribute('data-full-text');
          copyText(text, item, '已复制');
        });
      });

      // 添加复制所有按钮功能
      section.querySelector('.copy-all-btn').addEventListener('click', () => {
        const allText = data.join('\n');
        copyText(allText, section.querySelector('.copy-all-btn'), '已复制全部');
      });
    }
  });

  // 如果没有任何数据，显示提示信息
  if (container.children.length === 0) {
    container.innerHTML = '<div class="no-results">未发现任何信息</div>';
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
  if (message.type === 'SCAN_COMPLETE' && message.results) {
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