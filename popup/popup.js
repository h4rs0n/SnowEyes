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
    { id: 'image-list', data: results.imageFiles, title: '图片资源' },
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
  
  // 处理服务器组件信息
  if (fingerprints.serverComponents) {
    const components = fingerprints.serverComponents;
    
    // 显示Web服务器信息
    if (components.webServer) {
      const server = components.webServer;
      let description = `通过Server响应头识别Web服务器为${server.name}`;
      
      if (server.subType) {
        description += `(${server.subType})`;
      }
      
      if (server.component) {
        description += `，使用${server.component.name}组件(版本${server.component.version})`;
      } else if (server.version) {
        description += `，版本号为${server.version}`;
      }

      addFingerprint(fingerprintSection, {
        type: 'WebServer',
        name: server.subType ? `${server.name} ${server.subType}` : server.name,
        description: description,
        value: server.component ? server.component.version : (server.version || '版本未知')
      });
    }

    // 显示操作系统信息
    if (components.os) {
      addFingerprint(fingerprintSection, {
        type: 'OS',
        name: components.os.name,
        description: `通过Server响应头识别服务器操作系统为${components.os.name}`,
        value: components.os.version

      });
    }

    // 显示扩展信息
    components.extensions.forEach(ext => {
      addFingerprint(fingerprintSection, {
        type: 'SSL',
        name: ext.name,
        description: `通过Server响应头识别Web服务器扩展为${ext.name}，版本号为${ext.version}`,
        value: ext.version
      });
    });

    // 显示模块信息
    components.modules.forEach(mod => {
      addFingerprint(fingerprintSection, {
        type: 'Module',
        name: mod.name,
        description: `通过Server响应头识别服务器模块为${mod.name}，版本号为${mod.version}`,
        value: mod.version
      });
    });
  }

  // 处理技术栈识别结果
  if (fingerprints.technology) {
    addFingerprint(fingerprintSection, {
      type: 'Technology',
      name: fingerprints.technology.name,
      description: fingerprints.technology.description || `通过页面特征识别到${fingerprints.technology.name}`,
      value: fingerprints.technology.description.match(/版本号为([^，]+)/)?.[1] || fingerprints.technology.version || '版本未知'
    });
  }

  // 处理其他响应头
  for (const [headerName, headerValue] of Object.entries(fingerprints.headers)) {
    // 如果这个头的信息已经在 technology 或 security 中显示过，就跳过
    if ((fingerprints.technology && 
         headerName.toLowerCase() === 'x-powered-by' && 
         headerValue.toLowerCase().includes(fingerprints.technology.name.toLowerCase())) ||
        (fingerprints.security &&
         headerName.toLowerCase() === 'x-powered-by' &&
         headerValue.toLowerCase().includes(fingerprints.security.name.toLowerCase()))) {
      continue;
    }

    // 特殊处理 ASP.NET 相关头
    if (headerName.toLowerCase() === 'x-aspnetmvc-version') {
      addFingerprint(fingerprintSection, {
        type: 'Technology',
        name: 'ASP.NET MVC',
        description: `通过X-AspNetMvc-Version响应头识别，网站使用ASP.NET MVC框架，版本号为${headerValue}`,
        value: headerValue
      });
      continue;
    }

    if (headerName.toLowerCase() === 'x-aspnet-version') {
      addFingerprint(fingerprintSection, {
        type: 'Technology',
        name: 'ASP.NET Runtime',
        description: `通过X-AspNet-Version响应头识别，网站运行在.NET Framework ${headerValue}环境`,
        value: headerValue
      });
      continue;
    }

    // 其他头的处理保持不变
    let name, version;
    if (headerValue.includes('/')) {
      [name, version] = headerValue.split('/');
    } else {
      name = headerValue;
      version = null;
    }

    const headerTypes = {
      'x-powered-by': 'PoweredBy',
      'x-aspnet-version': 'ASP.NET',
      'x-runtime': 'Runtime'
    };

    addFingerprint(fingerprintSection, {
      type: headerTypes[headerName.toLowerCase()] || headerName,
      name: name,
      description: `通过${headerName}响应头识别${name}，${version ? '版本号为' + version : '版本号未知'}`,
      value: version || '版本未知'
    });
  }

  // 显示安全组件信息
  if (fingerprints.security) {
    const security = fingerprints.security;
    addFingerprint(fingerprintSection, {
      type: 'Security',
      name: security.name,
      description: security.description,  // 直接使用组件提供的描述
      value: security.version || '版本未知'
    });
  }

  // 在 updateServerFingerprints 函数中添加对 analytics 的处理
  if (fingerprints.analytics) {
    addFingerprint(fingerprintSection, {
      type: 'Analytics',
      name: fingerprints.analytics.name,
      description: fingerprints.analytics.description,
      value: fingerprints.analytics.version || '版本未知'
    });
  }

  // 在 updateServerFingerprints 函数中添加对 builder 的处理
  if (fingerprints.builder) {
    addFingerprint(fingerprintSection, {
      type: 'Builder',
      name: fingerprints.builder.name,
      description: fingerprints.builder.description,
      value: fingerprints.builder.version || '版本未知'
    });
  }
}

// 解析服务器信息
function parseServerInfo(serverHeader) {
  const parts = serverHeader.split(' ');
  const [name, version] = parts[0].split('/');
  // 如果有额外信息（如 OpenSSL 版本等），将其添加到版本信息中
  const extraInfo = parts.slice(1).join(' ');
  return {
    name: name,
    version: extraInfo ? `${version} ${extraInfo}` : version
  };
}

// 添加单个指纹组
function addFingerprint(container, info) {
  const group = document.createElement('div');
  group.className = `fingerprint-group ${info.type.toLowerCase()}-group`;
  group.innerHTML = `
    <h3>
      <span class="tag ${info.type.toLowerCase()}-tag">${info.type}</span>
      ${info.name}
    </h3>
    <div class="fingerprint-item">
      <div class="fingerprint-label">${info.description}</div>
      <div class="fingerprint-value server-value detected">${info.value}</div>
    </div>
  `;
  container.appendChild(group);
}

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'UPDATE_FINGERPRINTS' && message.fingerprints) {
    console.log('Received fingerprints:', message.fingerprints); // 添加调试日志
    updateServerFingerprints(message.fingerprints);
  }
});

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