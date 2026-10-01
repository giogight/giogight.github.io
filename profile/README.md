# 观潮个人主页模块

入口：`profile/index.html`。这是静态、可离线加载的独立页面，可由统一应用以同源 iframe 嵌入，不需要 npm 包、账号、地图服务或服务器 API。

包含：简短个人主页、可跳过/关闭/重播的黑客风格介绍、三张摄影背景，以及右下角 SVG 入口打开的独立接球面板。游戏与旅游在这里仅作为兴趣介绍，不重复放工具功能。

`intro.css`、介绍分镜和本地 `assets/` 来自旧个人站。图片为旧站既有素材，没有读取私人照片。图片选择、提交验证、所有自毁倒计时和爆炸逻辑均未移入新页面。

## 嵌入和暂停

```html
<iframe src="profile/index.html" title="小文的个人主页"></iframe>
```

换模块/应用隐藏时：

```js
frame.contentWindow.postMessage({ type: 'guanchao:pause' }, window.location.origin);
```

回来时发送 `guanchao:resume`。页面只接受 `event.source === window.parent` 且 `event.origin === window.location.origin` 的消息。`file://` 外壳的双方 origin 为 `null` 时仍校验精确 parent Window；发送消息的外壳需用 `*` 作为 targetOrigin，普通 HTTP 外壳使用实际 origin。

暂停会保留介绍当前位置，停止介绍计时和噪声绘制、挂起音效、关闭接球并停止运动。恢复会继续此前开启的介绍，不自动开始新游戏。浏览器隐藏和页面离开也会停止活动。图片背景没有动画、按钮或选择状态，没有读取/写入浏览器存储。

## 接球规则与实现

默认难度 +2：初始纵向速度 416.5875 px/s、合成反弹速度上限 700.925 px/s；桌面挡板宽度 9.72%，窗口不超过 520 px 时为 13.77%。保留 5 次目标、3 次容错、原球大小和至少 10 px 挡板高度。入口按钮 58×58 px；难度没有通过缩小点击目标增加。

`pong-core.js` 为无 DOM 的独立运动模块。物理以 240 Hz 固定子步推进，使用挡板平面穿越位置检查；30 Hz 与 60 Hz 渲染下速度一致。每次挡板反弹速度增加 10%，受总速度上限约束。独立开始、胜负、重试、关闭生命周期不依赖介绍场景，游戏完成不会进入介绍后续分镜。手机拖动使用 pointer capture，鼠标与方向键/A D 也可控制。

## 验证

运行 `node --check profile.js`、`node --check pong-core.js`、`node test/pong-core.test.cjs` 和 `node test/profile-lifecycle.test.cjs`。

10 项核心检查覆盖档位计算、初始真实总速度、桌面/手机尺寸、反弹封顶、5 次完成、3 次失败、墙面与移动边界、30/60 Hz 一致性、缩放和长时间停顿、四种宽度运动边界、DOM 引用和离线素材完整性。另有 3 项 DOM 模拟检查验证介绍启动/跳过/暂停/恢复/关闭、独立游戏关闭与切模块即停、重复开始不重置、错误 origin/source 被拒绝、浏览器隐藏即停。DOM 模拟检查不代表真实浏览器、实体 iPhone 或线上验收。
