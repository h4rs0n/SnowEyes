const searchEngines = [
  { id: 'baidupc', name: '百度PC' },
  { id: 'google', name: 'Google' },
  { id: '360', name: '360搜索' },
  { id: 'baidum', name: '百度移动' },
  { id: 'sougou', name: '搜狗' },
  { id: 'shenma', name: '神马' }
];
const imageCache = new WeakMap();

// 页面切换功能
function switchPage(pageName) {
  // 清理旧页面的资源
  if (currentPageCleanup) currentPageCleanup();
  
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
      initializePage(pageName);
    }
  });
}

// 统一页面初始化逻辑
function initializePage(pageName) {
  switch(pageName) {
    case 'config':
      initConfigPage();
      break;
    case 'fingerprint':
      initFingerprintPage();
      break;
    case 'analysis':
      initAnalysisPage();
      break;
  }
}

// 保存白名单
function saveWhitelist() {
  const whitelistInput = document.getElementById('whitelistInput');
  if (!whitelistInput) return;
  
  // 获取输入的域名，过滤空行
  const domains = whitelistInput.value
    .split('\n')
    .map(domain => domain.trim())
    .filter(domain => domain && domain.length > 0);
  
  // 保存到存储
  chrome.storage.local.set({ customWhitelist: domains }, () => {
    showSaveTooltip('保存成功');
  });
}

// 显示保存提示
function showSaveTooltip(text) {
  const saveBtn = document.getElementById('saveWhitelist');
  if (!saveBtn) return;
  
  const rect = saveBtn.getBoundingClientRect();
  const tooltip = document.createElement('div');
  tooltip.className = 'copy-tooltip';
  tooltip.textContent = text;
  tooltip.style.left = `${rect.left + rect.width / 2}px`;
  tooltip.style.top = `${rect.top - 30}px`;
  document.body.appendChild(tooltip);
  
  setTimeout(() => tooltip.remove(), 1500);
}

// 检查当前域名是否在白名单中
function checkIfWhitelisted(hostname, callback) {
  chrome.storage.local.get(['customWhitelist'], (result) => {
    if (!result.customWhitelist || result.customWhitelist.length === 0) {
      callback(false);
      return;
    }
    
    const customWhitelist = result.customWhitelist.map(domain => domain.toLowerCase());
    const isWhitelisted = customWhitelist.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
    
    callback(isWhitelisted);
  });
}

// 显示扫描结果的函数
function displayResults(results) {
  // 定义要显示的数据部分
  const sections = [
    { id: 'domain-list', data: results.domains, title: '域名' },
    { id: 'absolute-api-list', data: results.absoluteApis, title: 'API接口(绝对路径)', hasUrlCopy: true },
    { id: 'api-list', data: results.apis, title: 'API接口(相对路径)', hasUrlCopy: true },
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
    { id: 'url-list', data: results.urls, title: 'URL' }
  ];

  // 获取容器
  const container = document.querySelector('.scanner-page .container');
  let html = '';

  // 遍历所有部分
  sections.forEach(({ id, data, title, hasUrlCopy }) => {
    // 如果数据存在且不为空
    if (data && data.length > 0) {
      html += `
        <div class="section">
          <div class="section-header">
            <div class="title-wrapper">
              <span class="title">${title}</span>
              <span class="count">(${data.length})</span>
            </div>
            <div class="button-group">
              <button class="copy-btn" title="复制全部">
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                复制全部
              </button>
              ${hasUrlCopy ? `
                <button class="copy-url-btn" title="复制URL">
                  <svg viewBox="0 0 24 24"><path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
                  复制URL
                </button>
              ` : ''}
            </div>
          </div>
          <div class="section-content">
            <div class="content-wrapper ${id}">
              ${Array.from(data).map(item => `
                <div class="item" title="来源: ${item[1]}" data-source="${item[1]}">
                  ${item[0]}
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
  
    // 添加复制URL事件监听
  container.querySelectorAll('.copy-url-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const section = btn.closest('.section');
      const items = Array.from(section.querySelectorAll('.item'));
      const sectionId = section.querySelector('.content-wrapper').className.split(' ')[1];
      
      getCurrentTab().then(tab => {
        if (tab) {
          const baseUrl = new URL(tab.url).origin;
          const currentUrl = new URL(tab.url);
          
          const urls = items.map(item => {
            const path = item.textContent.trim();
            if (sectionId === 'absolute-api-list') {
              // 绝对路径：直接拼接域名
              return baseUrl + path;
            } else if (sectionId === 'api-list') {
              // 相对路径：基于当前页面URL进行解析
              try {
                const fullUrl = new URL(path, currentUrl.href);
                return fullUrl.href;
              } catch (e) {
                // 如果解析失败，使用简单拼接
                const currentDir = currentUrl.pathname.substring(0, currentUrl.pathname.lastIndexOf('/'));
                return baseUrl + currentDir + '/' + path;
              }
            }
            return path;
          }).filter(Boolean).join('\n');
          
          copyToClipboard(urls, e.clientX, e.clientY);
        }
      });
    });
  });

  // 添加悬浮提示和点击复制来源事件监听
  container.querySelectorAll('.item').forEach(item => {
    item.addEventListener('click', (e) => {
      const source = item.dataset.source;
      if (source) {
        copyToClipboard(source, e.clientX, e.clientY);
      }
    });
  
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      copyToClipboard(item.textContent.trim(), e.clientX, e.clientY);
    });
  });
  
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

// 页面加载完成时的初始化
document.addEventListener('DOMContentLoaded', () => {
  const activePage = document.querySelector('.nav-tab.active').dataset.page;
  switchPage(activePage);

  // 初始化扫描页面
  const container = document.querySelector('.scanner-page .container');
  container.innerHTML = '<div class="loading">正在扫描...</div>';

  getCurrentTab().then(tab => {
    if (tab) {
      const hostname = new URL(tab.url).hostname.toLowerCase();
      // 先检查自定义白名单
      checkIfWhitelisted(hostname, (isWhitelisted) => {
        if (isWhitelisted) {
          container.innerHTML = '<div class="whitelisted">当前域名在白名单中，已跳过扫描</div>';
          updateProgress(100);
          return;
        }
        
        // 如果不在自定义白名单中，再发送消息获取结果
        chrome.tabs.sendMessage(tab.id, {type: 'GET_RESULTS', tabId: tab.id, from: 'popup'}, response => {
          if (chrome.runtime.lastError) {
            container.innerHTML = '<div class="error">无法连接到页面，尝试刷新页面后再试吧</div>';
          }else{
            displayResults(response);
            updateProgress(response.progress[0][1]);
          }
        });
      });
    }
  });

  initConfigPage();
  initEventListeners();
});

// 更新进度显示
function updateProgress(percent) {
  const progressTab = document.querySelector('.progress-tab');
  if (progressTab) {
    progressTab.textContent = `${percent}%`;
  }
}

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SCAN_UPDATE') {
    if (message.results) {
      displayResults(message.results);
    }
    updateProgress(message.results.progress[0][1]);
  }
});

// 初始化配置页面
function initConfigPage() {
  // 获取扫描设置和自定义白名单
  chrome.storage.local.get(['dynamicScan', 'deepScan', 'customWhitelist'], (result) => {
    const dynamicScanCheckbox = document.getElementById('dynamicScan');
    const deepScanCheckbox = document.getElementById('deepScan');
    const whitelistInput = document.getElementById('whitelistInput');
    
    if (dynamicScanCheckbox) {
      dynamicScanCheckbox.checked = result.dynamicScan === true;
    }
    if (deepScanCheckbox) {
      deepScanCheckbox.checked = result.deepScan === true;
    }
    
    // 显示自定义白名单
    if (whitelistInput && result.customWhitelist) {
      whitelistInput.value = result.customWhitelist.join('\n');
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
    if(fingerprintData.length === 0 || type === 'nameMap') continue;
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
  getCurrentTab().then(tab => {
    if (tab) {
      console.log('Requesting fingerprints for tab:', tab.id);
      chrome.runtime.sendMessage({
        type: 'GET_FINGERPRINTS',
        tabId: tab.id,
        from: 'popup',
        to: 'background'
      }, response => {
        console.log('Received response:', response);
        if (response) {
          updateServerFingerprints(response);
        }
      });
    }
  });
}
// 初始化网站解析页面
function initAnalysisPage() {
  const container = document.querySelector('.analysis-section');
  container.innerHTML = '<div class="loading">正在获取网站信息...</div>';
  
  let timeoutId = null;
  
  getCurrentTab().then(tab => {
    if (tab) {
      const domain = new URL(tab.url).hostname;
      timeoutId = setTimeout(() => {
        container.innerHTML = '<div class="error">请求超时，请重试</div>';
      }, 10000);

      chrome.runtime.sendMessage({
        type: 'GET_SITE_ANALYSIS',
        domain: domain,
        tabId: tab.id,
        from: 'popup',
        to: 'background'
      }, (response) => {
        clearTimeout(timeoutId);
        if (!response) {
          container.innerHTML = '<div class="error">获取网站信息失败</div>';
          return;
        }
        if (response.isPrivateIP) {
          container.innerHTML = '<div class="notice">内网地址无需解析</div>';
          return;
        }
        updateAnalysisPage(response, domain);
      });
    }
  });
  return () => {
    if (timeoutId) clearTimeout(timeoutId);
  };
}

// 更新网站解析页面内容
function updateAnalysisPage(data, domain) {
  const container = document.querySelector('.analysis-section');
  const icpData = data.icp?.data;
  container.innerHTML = `
    <!-- 基本信息 -->
    <div class="analysis-group basic-group">
      <h3>基本信息</h3>
      <div class="basic-info">
        <div class="info-item">
          <span class="info-label">域名</span>
          <span class="info-value">${icpData?.domain || domain}</span>
        </div>
        <div class="info-item">
          <span class="info-label">备案号</span>
          <span class="info-value">${icpData?.icp || '暂无备案信息'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">主办单位</span>
          <span class="info-value">${icpData?.unit || '未知'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">备案时间</span>
          <span class="info-value">${icpData?.time || '未知'}</span>
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

// 创建文档碎片批量更新
function updateElementsWithFragment(container, elements) {
  const fragment = document.createDocumentFragment();
  elements.forEach(element => fragment.appendChild(element));
  container.innerHTML = '';
  container.appendChild(fragment);
}

// 修改updateWeightInfo函数
function updateWeightInfo(weightData) {
  const container = document.querySelector('.weight-grid');
  
  if (weightData?.error) {
    container.textContent = weightData.error;
    return;
  }

  const elements = searchEngines.map(engine => {
    const element = document.createElement('div');
    element.className = 'weight-item';
    
    // 直接使用原始值
    const rawValue = weightData[engine.id] || 'n';
    
    const displayValue = rawValue;
    const imgValue = rawValue;

    const img = document.createElement('img');
    img.className = 'weight-img';
    img.dataset.engine = engine.id;
    img.dataset.src = `https://api.mir6.com/data/quanzhong_img/${engine.id}/${imgValue}.png`;
    img.alt = engine.name;

    const label = document.createElement('span');
    label.className = 'weight-label';
    label.textContent = engine.name;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'weight-value';
    valueSpan.textContent = displayValue;

    element.append(img, label, valueSpan);
    
    // 立即加载图片
    const tempImg = new Image();
    tempImg.src = img.dataset.src;
    
    tempImg.onload = () => {
      img.src = tempImg.src;
      img.classList.add('loaded');
    };
    
    tempImg.onerror = () => {
      img.src = `https://api.mir6.com/data/quanzhong_img/${engine.id}/0.png`;
      img.classList.add('loaded');
    };

    return element;
  });

  updateElementsWithFragment(container, elements);
}

// 更新IP信息
function updateIpInfo(ipData) {
  const ipInfo = document.querySelector('.ip-info');
  const data = ipData;
  ipInfo.innerHTML = `
    <div class="info-item">
      <span class="info-label">IPv4/6</span>
      <span class="info-value">${data.ip || '无'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">地理位置</span>
      <span class="info-value">${data.location || '无'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">邮政编码</span>
      <span class="info-value">${data.zipcode || '无'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">运营商</span>
      <span class="info-value">${data.isp || '无'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">协议</span>
      <span class="info-value">${data.protocol || '无'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">网络类型</span>
      <span class="info-value">${data.net || '无'}</span>
    </div>
  `;
}

// 统一事件管理
const eventListeners = {
  'click .nav-tab': handleNavClick,
  'change #dynamicScan': handleDynamicScan,
  'change #deepScan': handleDeepScan,
  'error .weight-img': handleImageError,
  'click #saveWhitelist': saveWhitelist
};

function initEventListeners() {
  // 清除可能存在的旧事件监听器
  document.body.removeEventListener('click', handleNavClick);
  document.body.removeEventListener('change', handleDynamicScan);
  document.body.removeEventListener('error', handleImageError);

  Object.entries(eventListeners).forEach(([eventKey, handler]) => {
    const [event, selector] = eventKey.split(' ');
    document.body.addEventListener(event, e => {
      if (!selector || e.target.matches(selector)) handler(e);
    });
  });
}

// 统一使用handleNavClick处理页面切换
function handleNavClick(e) {
  const tab = e.target.closest('.nav-tab');
  if (tab) {
    const pageName = tab.dataset.page;
    switchPage(pageName);
  }
}

// 添加通用的标签页查询函数
async function getCurrentTab() {
  const tabs = await chrome.tabs.query({active: true, currentWindow: true});
  return tabs[0] || null;
}

// 修改使用标签页查询的函数
function handleDynamicScan(e) {
  const enabled = e.target.checked;
  chrome.storage.local.set({ dynamicScan: enabled });
  
  getCurrentTab().then(tab => {
    if (tab) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'UPDATE_DYNAMIC_SCAN',
        enabled: enabled
      });
    }
  });
}

function handleDeepScan(e) {
  const enabled = e.target.checked;
  chrome.storage.local.set({ deepScan: enabled });
  
  getCurrentTab().then(tab => {
    if (tab) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'UPDATE_DEEP_SCAN',
        enabled: enabled
      });
    }
  });
}

function handleImageError(e) {
  if (e.target.classList.contains('weight-img')) {
    const engine = e.target.dataset.engine;
    e.target.src = `https://api.mir6.com/data/quanzhong_img/${engine}/0.png`;
  }
}

let currentPageCleanup = null; // 添加页面清理函数存储 