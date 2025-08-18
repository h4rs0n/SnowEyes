<p align="center">
    <img src="icons/logo.png" alt="logo" width="200">
</p>

# 雪瞳

**雪瞳** 是一款用于检测和提取网页中敏感信息的 Chrome 浏览器扩展。帮助用户快速获取网页中的敏感信息，并进行分析和处理。

---
## 一些使用技巧（方便好用）
对于单个结果，鼠标悬浮即可看到来源，单击左键复制来源，ctrl+左键跳转来源链接，单击右键复制结果

---
## v0.2.7.3更新
1. 大幅优化搜索时的网页卡顿问题，体验更流畅
2. 适配webpack网页js搜集，绝不放过每一处可能存在的js

和其他同类插件不同，雪瞳致力于更全面的js信息搜集，因此搜索时请多给雪瞳一些等待的时间，如果您发现了一些bug或是有更好的想法，欢迎提issue。

---
## v0.2.7.2更新

1. 添加来源显示（鼠标悬停对应结果显示数据来源，左键点击即可复制，ctrl+左键跳转对应链接）
2. 新增自定义白名单
3. 新增进度条，实时查看扫描进度
4. 优化访问部分网页会卡顿的情况，体验更丝滑
5. 优化扫描处理逻辑，更快的处理，更全面的js搜集
6. 深度扫描新增js文件路径猜解拼接，提高访问命中率
7. 其他细节优化......

注意: 
1. 深度扫描在一些情况下会出现很多js误匹配，此功能后续还需要多完善，正常情况下为了维持良好体验不建议使用
2. 关于备案信息的查询建议注册登录接口盒子使用自己的Id和key，因为公开的接口查询有限制
---
下个版本预计更新内容：当前版本问题优化，指纹添加，路径拼接优化，特殊网页处理，AI?，Maybe

如果您有更好的第三方接口欢迎提issue，当然您愿意分享的话。
firfox版本后续更新，可能延迟一周左右。欢迎提issue，感谢支持！

---

## 功能特点

1. 实现多种敏感信息，指纹等检测分类
2. 支持动态扫描，针对动态渲染的网页信息实时捕获
3. 支持深度扫描，针对某些js文件中嵌套js的网站进行深度扫描

## 使用详情

1. 将源码下载为压缩包文件后解压或直接clone
2. 在浏览器扩展中打开开发者模式
3. 点击加载解压的扩展，选中解压的文件夹，即可在插件列表中使用插件

---

## 界面展示
### 插件
<div style="text-align:center">
    <img src="icons/plugin.png" alt="插件" width="80%">
</div>

### 信息收集页面
<div style="text-align:center">
    <img src="icons/souji1.png" alt="信息收集界面" width="40%">
    <img src="icons/souji2.png" alt="信息收集界面" width="40%">
</div>

### 指纹嗅探页面
<div style="text-align:center">
    <img src="icons/xiutan1.png" alt="指纹嗅探" width="40%">
    <img src="icons/xiutan2.png" alt="指纹嗅探" width="40%">
</div>

### 网站解析页面
<div style="text-align:center">
    <img src="icons/jiexi1.png" alt="网站解析" width="40%">
    <img src="icons/jiexi2.png" alt="网站解析" width="40%">
</div>

### 配置页面
<div style="text-align:center">
    <img src="icons/config.png" alt="白名单" width="40%">
</div>

### 白名单页面
<div style="text-align:center">
    <img src="icons/white.png" alt="白名单" width="80%">
</div>
---

## 第三方接口声明

插件调用第三方免费接口:

- 米人API: https://api.mir6.com/
- 接口盒子: https://cn.apihz.cn/

## 注意事项

程序仍在开发中，一些功能没有完善还请见谅（不定时更新，如果有时间的话）。

1. 如遇js文件过多扫描需要时间，会出现卡顿情况。
2. 可能会出现未知bug。(毕竟这事情，谁也说不准，万一呢)。
3. 如遇问题或有新的设计想法，欢迎提issue，看到了就会回复

tips: 左键复制来源，右键复制结果

---

**雪瞳——洞悉无形，守护无界。**