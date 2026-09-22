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

`index.html`、`styles.css`、`app.js` 和 `assets/` 是网站运行文件。
不包含原托管平台配置、原仓库历史、账号凭据或私密文件。
所有“入侵”“自毁”均为网页剧情动画。
