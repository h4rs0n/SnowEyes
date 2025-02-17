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
  const whitelistDomains = document.querySelector('.whitelist-domains');
  if (!config) {
    whitelistDomains.innerHTML = '<div class="error">无法获取配置信息</div>';
    return;
  }

  // 显示白名单域名
  whitelistDomains.innerHTML = config.WHITELIST ? config.WHITELIST.map(domain => `
    <div class="domain-item">
      <span class="domain-text">${domain}</span>
    </div>
  `).join('') : '';
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
    { id: 'credentials-list', data: results.credentials, title: '用户名密码' },
    { id: 'cookie-list', data: results.cookies, title: 'Cookie' },
    { id: 'id-key-list', data: results.idKeys, title: 'ID密钥' },
    { id: 'phone-list', data: results.phones, title: '手机号码' },
    { id: 'email-list', data: results.emails, title: '邮箱' },
    { id: 'idcard-list', data: results.idcards, title: '身份证号' },
    { id: 'ip-list', data: results.ips, title: 'IP地址' },
    { id: 'company-list', data: results.companies, title: '公司机构' },
    { id: 'jwt-list', data: results.jwts, title: 'JWT Token' },
    { id: 'image-list', data: results.imageFiles, title: '音频图片' },
    { id: 'github-list', data: results.githubUrls, title: 'GitHub链接' },
    { id: 'vue-list', data: results.vueFiles, title: 'Vue文件' },
    { id: 'js-list', data: results.jsFiles, title: 'JS文件' },
    { id: 'url-list', data: results.urls, title: 'URL' },
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
      if (tab.dataset.page === 'fingerprint') {
        initFingerprintPage();
      }
      switchPage(tab.dataset.page);
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

  // 获取动态扫描开关状态
  chrome.storage.local.get(['dynamicScan', 'deepScan'], (result) => {
    document.getElementById('dynamicScan').checked = result.dynamicScan !== false;
    document.getElementById('deepScan').checked = result.deepScan === true;
  });

  // 监听动态扫描开关变化
  document.getElementById('dynamicScan').addEventListener('change', (e) => {
    const enabled = e.target.checked;
    chrome.storage.local.set({ dynamicScan: enabled });
    
    // 通知content script更新设置
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'UPDATE_DYNAMIC_SCAN',
          enabled: enabled
        });
      }
    });
  });

  // 监听深度扫描开关变化
  document.getElementById('deepScan').addEventListener('change', (e) => {
    const enabled = e.target.checked;
    chrome.storage.local.set({ deepScan: enabled });
    
    // 通知content script更新设置
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'UPDATE_DEEP_SCAN',
          enabled: enabled
        });
      }
    });
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
      // 获取配置信息
      chrome.tabs.sendMessage(tabs[0].id, {type: 'GET_CONFIG'}, response => {
        if (chrome.runtime.lastError || !response || !response.config) {
          const container = document.querySelector('.config-page .container');
          container.innerHTML = '<div class="error">请刷新页面后重试</div>';
          return;
        }
        displayConfig(response.config);
        
        // 获取动态扫描设置
        chrome.storage.local.get(['dynamicScan'], (result) => {
          const dynamicScanCheckbox = document.getElementById('dynamicScan');
          if (dynamicScanCheckbox) {
            dynamicScanCheckbox.checked = result.dynamicScan !== false; // 默认开启
            
            // 添加变更监听
            dynamicScanCheckbox.addEventListener('change', (e) => {
              const enabled = e.target.checked;
              chrome.storage.local.set({ dynamicScan: enabled });
              
              // 通知 content script 更新设置
              chrome.tabs.sendMessage(tabs[0].id, {
                type: 'UPDATE_DYNAMIC_SCAN',
                enabled: enabled
              });
            });
          }
        });
      });
    }
  });
}

// 更新服务器指纹信息
function updateServerFingerprints(fingerprints) {
  const fingerprintSection = document.querySelector('.fingerprint-section');
  fingerprintSection.innerHTML = '';
  
  // 检查是否有任何指纹
  let hasFingerprints = false;
  for (const type in fingerprints) {
    if (fingerprints[type] && fingerprints[type].length > 0) {
      hasFingerprints = true;
      break;
    }
  }
  
  // 如果没有识别到任何指纹，显示提示信息
  if (!hasFingerprints) {
    fingerprintSection.innerHTML = `
      <div class="notice">
        暂未识别到指纹
      </div>
    `;
    return;
  }
  
  // 遍历所有指纹类型
  for (const [type, fingerprintData] of Object.entries(fingerprints)) {
    // 如果是数组，遍历数组中的每个指纹
    if (fingerprintData.length > 0) {
      for (const fingerprint of fingerprintData) {
        addFingerprint(fingerprintSection, {
          type: type,
          name: fingerprint.name,
          description: fingerprint.description,
          value: fingerprint.version || fingerprint.name
        });
      }
    } 
  }
}

// 添加单个指纹组
function addFingerprint(container, info) {
  const group = document.createElement('div');
  group.className = `fingerprint-group ${info.type}-group`;
  group.innerHTML = `
    <h3>
      <span class="tag ${info.type}-tag">${info.type[0].toUpperCase()+info.type.slice(1)}</span>
      ${info.name}
    </h3>
    <div class="fingerprint-item">
      <div class="fingerprint-label">${info.description}</div>
      <div class="fingerprint-value server-value detected">${info.value}</div>
    </div>
  `;
  container.appendChild(group);
}

// 初始化指纹页面
function initFingerprintPage() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      console.log('Requesting fingerprints for tab:', tabs[0].id); // 添加调试日志
      chrome.runtime.sendMessage({
        type: 'GET_FINGERPRINTS',
        tabId: tabs[0].id
      }, response => {
        console.log('Received response:', response); // 添加调试日志
        if (response) {
          updateServerFingerprints(response);
        }
      });
    }
  });
}
// 添加消息监听器处理 popup 的请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_FINGERPRINTS') {
    const fingerprints = serverFingerprints.get(request.tabId);
    if (fingerprints) {
      sendResponse({
        server: fingerprints.server,
        headers: Object.fromEntries(fingerprints.headers),
        technology: fingerprints.technology
      });
    } else {
      sendResponse(null);
    }
    return true;
  }
  // ... 其他代码
});

// 修改初始化网站解析页面函数
function initAnalysisPage() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      const url = new URL(tabs[0].url);
      const domain = url.hostname;
      
      // 显示加载状态
      const container = document.querySelector('.analysis-section');
      container.innerHTML = '<div class="loading">正在获取网站信息...</div>';

      // 请求数据
      chrome.runtime.sendMessage({
        type: 'GET_SITE_ANALYSIS',
        domain: domain
      }, response => {
        if (response) {
          if (response.isPrivateIP) {
            container.innerHTML = '<div class="notice">内网IP地址，已跳过解析</div>';
            return;
          }
          // 即使数据不完整也显示已有的数据
          updateAnalysisPage(response, domain);
          
          // 如果数据不完整，显示部分加载中的状态
          if (!response.weight) {
            document.querySelector('.weight-grid').innerHTML = '<div class="loading">正在获取权重信息...</div>';
          }
          if (!response.ip) {
            document.querySelector('.ip-info').innerHTML = '<div class="loading">正在获取IP信息...</div>';
          }
        } else {
          container.innerHTML = '<div class="error">获取网站信息失败</div>';
        }
      });
    }
  });
}

// 更新网站解析页面内容
function updateAnalysisPage(data, domain) {
  const container = document.querySelector('.analysis-section');
  container.innerHTML = `
    <!-- 基本信息 -->
    <div class="analysis-group basic-group">
      <h3>基本信息</h3>
      <div class="basic-info">
        <div class="info-item">
          <span class="info-label">域名</span>
          <span class="info-value">${domain}</span>
        </div>
        <div class="info-item">
          <span class="info-label">备案号</span>
          <span class="info-value">粤B2-20090059</span>
        </div>
        <div class="info-item">
          <span class="info-label">注册商</span>
          <span class="info-value">腾讯云</span>
        </div>
        <div class="info-item">
          <span class="info-label">到期时间</span>
          <span class="info-value">2024-03-17</span>
        </div>
      </div>
    </div>

    <!-- 域名权重信息 -->
    <div class="analysis-group weight-group">
      <h3>搜索引擎权重</h3>
      <div class="weight-grid"></div>
    </div>

    <!-- IP地址信息 -->
    <div class="analysis-group ip-group">
      <h3>IP信息</h3>
      <div class="ip-info"></div>
    </div>

    <!-- Whois信息 -->
    <div class="analysis-group whois-group">
      <h3>Whois信息</h3>
      <div class="whois-info">
        <div class="info-item">
          <span class="info-label">注册时间</span>
          <span class="info-value">1995-05-04</span>
        </div>
        <div class="info-item">
          <span class="info-label">更新时间</span>
          <span class="info-value">2023-03-17</span>
        </div>
        <div class="info-item">
          <span class="info-label">DNS服务器</span>
          <span class="info-value">ns1.qq.com</span>
        </div>
        <div class="info-item">
          <span class="info-label">状态</span>
          <span class="info-value">clientDeleteProhibited</span>
        </div>
      </div>
    </div>
  `;
  
  // 更新权重信息
  if (data.weight) {
    const weightData = data.weight.data;
    updateWeightInfo(weightData);
  }

  // 更新IP信息
  if (data.ip) {
    const ipData = data.ip.data;
    updateIpInfo(ipData);
  }
}

// 更新权重信息
function updateWeightInfo(weightData) {
  const weightItems = {
    'baidupc': ['百度PC', weightData?.baidupc || '无', weightData?.baidupc_img],
    'baidum': ['百度移动', weightData?.baidum || '无', weightData?.baidum_img],
    'so360': ['360', weightData?.so360 || '无', weightData?.so360_img],
    'shenma': ['神马', weightData?.shenma || '无', weightData?.shenma_img],
    'sougou': ['搜狗', weightData?.sougou || '无', weightData?.sougou_img],
    'google': ['Google', weightData?.google || '无', weightData?.google_img]
  };

  const weightGrid = document.querySelector('.weight-grid');
  weightGrid.innerHTML = '';

  for (const [key, [label, value, imgSrc]] of Object.entries(weightItems)) {
    weightGrid.innerHTML += `
      <div class="weight-item">
        <img src="${imgSrc || ''}" alt="${label}" onerror="this.style.display='none'">
        <span class="weight-label">${label}</span>
        <span class="weight-value">${value}</span>
      </div>
    `;
  }
}

// 更新IP信息
function updateIpInfo(ipData) {
  const ipInfo = document.querySelector('.ip-info');
  ipInfo.innerHTML = `
    <div class="info-item">
      <span class="info-label">IPv6</span>
      <span class="info-value">${ipData?.ip || '无'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">IPv4</span>
      <span class="info-value">${ipData?.myip || '无'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">地理位置</span>
      <span class="info-value">${ipData?.location || '无'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">运营商</span>
      <span class="info-value">${ipData?.isp || '无'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">协议</span>
      <span class="info-value">${ipData?.protocol || '无'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">网络类型</span>
      <span class="info-value">${ipData?.net || '无'}</span>
    </div>
  `;
}

// 在页面切换时初始化网站解析页面
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    if (tab.dataset.page === 'analysis') {
      initAnalysisPage();
    }
    switchPage(tab.dataset.page);
  });
}); 