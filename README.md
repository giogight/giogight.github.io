# 小文的个人主页

公开访问地址：https://giogight.github.io/

纯静态 HTML、CSS、JavaScript 网站，包含图片、视频及接球小游戏，无需安装依赖或构建。

## GitHub Pages 发布设置

- 仓库：`giogight/giogight.github.io`，可见性为 Public。
- Settings → Pages → Build and deployment。
- Source 选择 **Deploy from a branch**。
- Branch 选择 **main**，目录选择 **/ (root)**，保存。
- `.nojekyll` 使 GitHub 直接发布静态文件。
- 发布后启用 Enforce HTTPS（选项可用时）。

后续修改网页和素材后推送到 main，GitHub Pages 会自动重新发布。

## 文件范围

`index.html`、`styles.css`、`app.js`、`tools.css`、`tools-data.js`、`home-tools.js`、`vendor/` 和 `assets/` 是网站运行文件。
不包含原托管平台配置、原仓库历史、账号凭据或私密文件。
所有“入侵”“自毁”均为网页剧情动画。

## 正常首页工具

- 游戏搭子决策器：按人数、PC / 手机 / PS / Switch 平台、时间、气氛、免费和新手条件筛选，抽选并复制邀请。
- 旅行规划：18 座国内城市，收藏统计，TXT / CSV / JSON 名单导入，偏好评分、地图和编辑整理的行程建议。
- 城市名单仅在本机处理，收藏存于当前浏览器 localStorage，可导出 JSON 备份。无服务端收集、账号系统或跨设备同步。
- 地图为本地引入的 Leaflet 1.9.4（BSD-2-Clause，见 vendor/leaflet/LICENSE），底图来自 OpenStreetMap。地图请求涉及第三方服务；底图不可达时仍可使用城市列表。
- 热度代表个人偏好匹配分，不是实时客流。推荐是透明规则评分，尚未接入 AI 大模型。日预算与游览时间为编辑估计，非实时价格。
- 入侵演出改为点击“读取个人档案”启动，不自动打断正常工具；接球目标 5 次、3 次容错；起始纵向球速 260px/s，反弹速度上限 445px/s，挡板为桌面宽度 16% / 手机宽度 22%。

继续免费托管在 GitHub Pages。接入真正的大模型时需另外部署服务端代理并保管密钥，不能把 API 密钥写进此公开仓库。
- 旅行结果仅在点击“分析我的下一站”后显示，修改条件或收藏后收起等待重新分析；地图也延迟到首次分析时加载。
- 原结尾视频已移到正常主页旅行标题区，静音循环、低对比背景、可暂停；不可见、切出页面或入侵演出时暂停。开启减少动态效果时默认不播放。入侵流程不再包含视频关卡。
