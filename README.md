# Wander

Vue 3 + TypeScript + Vite 前端，Express + SQLite 后端。登录使用 bcrypt 密码哈希和有效期 7 天的 JWT；详细实现和修复记录见 [代码审查记录](./docs/CODE_REVIEW.md)。

目录职责和旧文件的新位置见 [项目结构说明](./docs/PROJECT_STRUCTURE.md)。页面按业务分组，公共布局放在 `src/components/layout`，相册照片页面位于 `src/views/gallery/RegionGalleryPage.vue`。

## 开发运行

```sh
npm install
npm install --prefix server
```

复制 `server/.env.example` 为 `server/.env`，填写随机 `JWT_SECRET`，聊天需要填写 `DEEPSEEK_API_KEY`。不要把密钥放进 `VITE_` 前缀变量。

一个终端同时启动前后端：

```sh
npm run dev
```

需要分开运行时，两个终端分别执行 `npm run dev:server` 和 `npm run dev:client`，不要与合并启动重复运行。

本地 `.env.local` 使用 `VITE_API_BASE_URL=/api`，Vite 转发到 `http://localhost:3000`，浏览器不会直接跨域请求后端。后端按顺序读取 `server/.env` 与根目录 `.env.local`，已存在的进程环境变量优先。

可选后端配置：`PORT`、`CORS_ORIGINS`（逗号分隔的前端源）、`DB_PATH`（默认 `server/wander.db`）。修改后端端口时也要调整 Vite 代理。

## 验证

```sh
npm run build
npm test --prefix server
npm run test:dev
npm run test:ui
```

测试使用内存数据库和模拟 AI 响应，不修改已有用户数据，不调用真实 AI 服务。

`test:dev` 额外启动隔离的 API 和 Vite，验证注册、登录、身份查询通过开发代理正常工作。

`test:ui` 使用隐藏的 Chrome/Edge 验证手机尺寸下的 Home 导航、相册弹窗、照片选择和相册信息保存；使用内存数据库，不修改现有账号。Windows 自动查找浏览器，其他位置可设置 `CHROME_PATH`；未找到浏览器时跳过此项。

Gallery 的新增相册按钮支持名称和简介，相册信息按账号保存在当前浏览器。照片仍是本地预览，刷新后需要重新选择。

## AI 聊天保存与恢复

聊天会话、消息、输入草稿和上次打开的会话保存在后端 SQLite（默认 `server/wander.db`），按 JWT 验证后的账号隔离。同一账号在其他浏览器登录后可以恢复已同步的历史与草稿。重命名、删除会话也会保存到服务器。列表和消息分页加载。

启动后端会自动添加聊天相关表，不清空已有账号数据。更新代码后重启 `npm run dev`；部署时必须保留数据库文件或配置持久化的 `DB_PATH`。这套实现按单个 API 进程运行设计。

浏览器已有的 `wander_conversations:<userId>` 记录在登录后自动导入，原始记录留作备份。服务器导入凭据防止重复导入，已删除的导入会话也不会被旧浏览器重新创建。不自动导入无法确定账号归属的旧 `wander_conversations` 键。旧记录只有简略时间，保留原显示时间；新消息使用完整时间戳。导入失败会显示同步提示并保留本地原记录；单次导入一份会话，限制 2 MB、5000 条消息。

输入草稿延迟约 400 毫秒同步，并有按账号和会话区分的本地备份。多设备版本冲突会保留本地草稿并提示重新同步，不会静默覆盖服务器。消息发送使用请求标识去重，服务器读取数据库历史组织模型上下文。

AI 流仍通过 SSE 返回；后端保存首段文字，之后按约 500 毫秒的接收间隔保存进度，结束时保存完整回复。客户端断开、超时或后端重启后，已保存的部分显示为中断，可重试最后一条失败或中断的回复；重试不会重复创建用户消息。关闭页面后不会继续后台生成或自动续写。异常强制终止时只能恢复已写入的进度。

`npm run test:ui` 另用两个独立浏览器配置验证旧记录导入、同账号历史和草稿恢复、改名、删除、账号切换、响应丢失、断流重试与版本冲突。所有 AI 响应均为模拟。

## 部署

构建前端后部署 `dist`，启动后端 `npm start --prefix server`。托管端需要把 `/api` 代理到后端，同时为前端历史路由配置 `index.html` 回退。分域部署时，配置前端 `VITE_API_BASE_URL` 和后端 `CORS_ORIGINS`；公网使用 HTTPS。
