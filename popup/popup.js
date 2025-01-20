// 页面切换功能
function switchPage(pageName) {
  // 更新导航栏状态
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.page === pageName) {
      tab.classList.add('active');
    }
  });

  // 更新页面显示
  document.querySelectorAll('.page').forEach(page => {
    page.style.display = 'none';
    if (page.classList.contains(`${pageName}-page`)) {
      page.style.display = 'block';
      if (pageName === 'config') {
        initConfigPage();
      }
    }
  });
}

// 显示配置信息
function displayConfig(config) {
  const container = document.querySelector('.config-page .container');
  if (!config) {
    container.innerHTML = '<div class="error">无法获取配置信息</div>';
    return;
  }

  let html = `
    <div class="config-section">
      <div class="config-group">
        <h3>扫描白名单</h3>
        <div class="config-content">
          以下域名将不会被扫描：
        </div>
        <div class="whitelist-domains">
          ${config.WHITELIST ? config.WHITELIST.map(domain => `
            <div class="domain-item">
              <span class="domain-text">${domain}</span>
            </div>
          `).join('') : ''}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// 显示扫描结果的函数
function displayResults(results) {
  // 定义要显示的数据部分
  const sections = [
    { id: 'domain-list', data: results.domains, title: '域名' },
    { id: 'absolute-api-list', data: results.absoluteApis, title: 'API接口(绝对路径)' },
    { id: 'api-list', data: results.apis, title: 'API接口(相对路径)' },
    { id: 'module-list', data: results.moduleFiles, title: '模块路径' },
    { id: 'doc-list', data: results.docFiles, title: '文档文件' },
    { id: 'ip-list', data: results.ips, title: 'IP地址' },
    { id: 'phone-list', data: results.phones, title: '手机号码' },
    { id: 'email-list', data: results.emails, title: '邮箱' },
    { id: 'idcard-list', data: results.idcards, title: '身份证号' },
    { id: 'jwt-list', data: results.jwts, title: 'JWT Token' },
    { id: 'aws-list', data: results.awsKeys, title: 'AWS Key' },
    { id: 'image-list', data: results.imageFiles, title: '图片资源' },
    { id: 'vue-list', data: results.vueFiles, title: 'Vue文件' },
    { id: 'js-list', data: results.jsFiles, title: 'JS文件' },
    { id: 'url-list', data: results.urls, title: 'URL' }
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
            <div class="title-wrapper">
              <span class="title">${title}</span>
              <span class="count">(${data.length})</span>
            </div>
            <button class="copy-btn" title="复制全部">
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
              复制全部
            </button>
          </div>
          <div class="section-content">
            <div class="content-wrapper ${id}">
              ${Array.from(data).map(item => `
                <div class="item">
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

  // 添加复制事件监听
  container.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const section = btn.closest('.section');
      const items = Array.from(section.querySelectorAll('.item'));
      const text = items.map(item => item.textContent.trim()).filter(Boolean).join('\n');
      copyToClipboard(text, e.clientX, e.clientY);
    });
  });

  // 添加右键复制事件监听
  container.querySelectorAll('.item').forEach(item => {
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      copyToClipboard(item.textContent.trim(), e.clientX, e.clientY);
    });
  });

  // 处理长文本
  handleLongText();
}

// 显示复制成功提示
function showCopyTooltip(text, x, y) {
  const tooltip = document.createElement('div');
  tooltip.className = 'copy-tooltip';
  tooltip.textContent = text;
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
  document.body.appendChild(tooltip);
  
  setTimeout(() => tooltip.remove(), 1500);
}

// 复制文本到剪贴板
async function copyToClipboard(text, x, y) {
  try {
    await navigator.clipboard.writeText(text);
    showCopyTooltip('复制成功', x, y);
  } catch (err) {
    showCopyTooltip('复制失败', x, y);
  }
}

// 渲染结果到页面
function renderResults(results) {
  const container = document.querySelector('.scanner-page');
  if (!container) return;

  // 清空现有内容
  container.innerHTML = '';

  // 定义结果类型
  const resultTypes = [
    { id: 'domain-list', data: results.domains, title: '域名' },
    { id: 'api-list', data: results.apis, title: 'API' },
    { id: 'static-list', data: results.staticFiles, title: '静态文件' },
    { id: 'ip-list', data: results.ips, title: 'IP' }
  ];

  // 渲染每种类型的结果
  resultTypes.forEach(({ id, data, title }) => {
    if (!data || data.size === 0) return;

    const section = document.createElement('div');
    section.className = 'section';

    // 创建标题栏
    const header = document.createElement('div');
    header.className = 'section-header';

    const titleWrapper = document.createElement('div');
    titleWrapper.className = 'title-wrapper';

    const titleText = document.createElement('span');
    titleText.className = 'title';
    titleText.textContent = title;

    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = `(${data.size})`;

    titleWrapper.appendChild(titleText);
    titleWrapper.appendChild(count);

    // 创建复制按钮
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.innerHTML = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>复制全部';
    
    copyBtn.addEventListener('click', (e) => {
      const allText = Array.from(data).join('\\n');
      copyToClipboard(allText, e.clientX, e.clientY);
    });

    header.appendChild(titleWrapper);
    header.appendChild(copyBtn);

    // 创建内容区域
    const content = document.createElement('div');
    content.className = 'section-content';

    // 创建结果项
    Array.from(data).forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.className = 'item';
      itemElement.textContent = item;
      
      itemElement.addEventListener('click', (e) => {
        copyToClipboard(item, e.clientX, e.clientY);
      });

      content.appendChild(itemElement);
    });

    section.appendChild(header);
    section.appendChild(content);
    container.appendChild(section);
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
            container.innerHTML = '<div class="error">无法连接到页面，尝试刷新页面后再试吧</div>';
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
          container.innerHTML = '<div class="error">无法连接到页面，尝试刷新页面后再试吧</div>';
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

// 初始化配置页面
function initConfigPage() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {type: 'GET_CONFIG'}, response => {
        if (chrome.runtime.lastError || !response || !response.config) {
          const container = document.querySelector('.config-page .container');
          container.innerHTML = '<div class="error">请刷新页面后重试</div>';
          return;
        }
        displayConfig(response.config);
      });
    }
  });
} 