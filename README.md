<p align="center">
    <img src="icons/logo.png" alt="logo" width="200">
</p>

# 雪瞳

**雪瞳** 是一款用于检测和提取网页中敏感信息的 Chrome 浏览器扩展。帮助用户快速获取网页中的敏感信息，并进行分析和处理。

---

## 功能特点

### 1. 多类型信息检测
- **域名检测**
- **API 接口路径**
- **IP 地址**
- **手机号码**
- **邮箱地址**
- **账号密码**
- **Cookie**
- **身份证号**
- **文档文件**
- **JS文件**
- **图片资源**
- **URL 链接**
- **JWT Token**
- **···**

### 2. 实时扫描
- 页面加载完成后自动开始扫描
- 支持增量式扫描，获取一个资源就立即处理
- 定期更新扫描结果，无需等待所有资源加载完成

### 3. 全面的资源收集
- HTML 内容扫描
- JavaScript 文件内容扫描
- Meta 标签内容检测
- 数据属性检测
- 外部资源链接检测
- 大文件分块处理

### 4. 智能过滤
- 域名黑名单过滤
- URL 解码和清理
- 垃圾信息自动过滤

### 5. 用户友好界面
- 分类展示检测结果
- 支持一键复制单个结果
- 支持复制分类下所有结果
- 实时显示检测数量
- 刷新按钮重新触发检测

### 6. 配置查看
- 白名单展示

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


---

## 注意事项

程序仍在开发中，很多功能都没有完善，还请见谅。

1. 大型网页的完整扫描可能需要点时间。
2. 可能会出现未知bug。
3. 如需修改黑白名单，可前往 `content/config/scanner.config.js` 文件中根据注释找到域名相关配置进行修改。
---

**雪瞳——洞悉无形，守护无界。**