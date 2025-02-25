<p align="center">
    <img src="icons/logo.png" alt="logo" width="200">
</p>

# 雪瞳

**雪瞳** 是一款用于检测和提取网页中敏感信息的 Chrome 浏览器扩展。帮助用户快速获取网页中的敏感信息，并进行分析和处理。

---
## 功能特点

1. 实现多种敏感信息，指纹等检测分类
2. 支持动态扫描，针对动态渲染的网页信息实时捕获
3. 支持深度扫描，针对某些js文件中嵌套js的网站进行深度扫描
4. 插件运行在浏览器环境中，天然环境优势，请求和用户正常浏览相似，可绕过爬虫识别以及部分waf拦截

## 使用详情

1. 将源码下载为压缩包文件后解压或直接clone
2. 在浏览器扩展中打开开发者工具
3. 点击加载解压的扩展，选中解压的文件夹，即可在插件列表中使用插件

---

## 界面展示
### 插件
<div style="text-align:center">
    <img src="icons/plugin.png" alt="插件" width="80%">
</div>

### 信息收集页面
<div style="text-align:center">
    <img src="icons/souji1.png" alt="信息收集界面" width="80%">
    <img src="icons/souji2.png" alt="信息收集界面" width="80%">
    <img src="icons/souji3.png" alt="信息收集界面" width="80%">
</div>

### 白名单页面
<div style="text-align:center">
    <img src="icons/white.png" alt="白名单" width="80%">
</div>

### 指纹嗅探页面
<div style="text-align:center">
    <img src="icons/xiutan1.png" alt="指纹嗅探" width="80%">
    <img src="icons/xiutan2.png" alt="指纹嗅探" width="80%">
</div>

### 网站解析页面
<div style="text-align:center">
    <img src="icons/jiexi1.png" alt="网站解析" width="80%">
    <img src="icons/jiexi2.png" alt="网站解析" width="80%">
</div>
---

## 第三方接口声明

插件调用第三方免费接口:

- 米人API: https://api.mir6.com/
- 接口盒子: https://cn.apihz.cn/

## 注意事项

程序仍在开发中，一些功能没有完善还请见谅（不定时更新，如果有时间的话）。

1. 大型网页的完整扫描可能需要点时间（极端情况比如一个网站加载上千个js文件，还可能会出现卡顿的情况，不过请耐心等待）。
2. 可能会出现未知bug。(毕竟这事情，谁也说不准，万一呢)
3. 如需修改黑白名单，可前往 `content/config/scanner.config.js` 文件中根据注释找到域名相关配置进行修改。

tips: 扫描出的单个结果右键点击即可复制。

---

**雪瞳——洞悉无形，守护无界。**