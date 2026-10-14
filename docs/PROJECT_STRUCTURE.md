# 项目文件结构

## 目录职责

```text
src/
  api/                    # Axios 实例、登录和注册接口（TypeScript）
  assets/
    icons/                # 图标，保留原有业务分类
    images/               # 照片和插画
    styles/               # 在应用中使用的全局样式
  components/
    layout/               # 背景布局、状态栏、底部导航
    journey/TripList.vue   # 行程页使用的列表组件
    gallery/PhotoGrid.vue  # 相册照片网格
  config/api.ts           # API 地址配置
  data/gallery-regions.ts # 相册目的地共用数据
  router/
    index.ts              # 路由定义和页面懒加载
    guards.ts             # 登录验证与重定向
    navigation.ts         # 页面资源加载失败恢复与提示
  stores/session.ts       # 当前账号的响应式状态及本机会话操作
  stores/gallery.ts       # 按账号保存的自定义相册
  stores/chat.ts          # 服务端聊天状态、草稿同步、旧记录导入和流式回复
  types/                  # 接口返回、照片卡片及路由元信息类型
  utils/api-error.ts      # 请求错误提示
  views/
    auth/                 # 登录、注册页面
    chat/                 # AI 聊天页面
    journey/              # 行程首页、行程详情
    gallery/              # 相册首页、目的地照片页面
    map/                  # 地图页面
    profile/              # 个人页面
  App.vue
  main.ts
server/
  config/env.js           # 环境变量读取
  database/index.js       # SQLite 初始化
  database/chat.js        # 聊天表、账号归属查询、发送事务与中断恢复
  middleware/             # 鉴权、请求限流
  routes/                 # 认证和 AI 聊天接口
  test/                   # 后端回归测试
  app.js                  # Express 应用
  index.js                # 启动入口
tests/                    # 前后端开发代理集成测试
docs/                     # 审查记录和结构说明
```

页面使用 PascalCase 文件名，公共组件与路由页面分开。跨目录引用使用 `@/`；业务共享类型放在 `types`，共享静态数据放在 `data`。新增目的地只需修改 `gallery-regions.ts`。

## 主要迁移位置

| 原路径 | 新路径 |
| --- | --- |
| `src/views/login.vue` | `src/views/auth/LoginPage.vue` |
| `src/views/register.vue` | `src/views/auth/RegisterPage.vue` |
| `src/views/home.vue` | `src/views/chat/ChatPage.vue` |
| `src/views/jour.vue` | `src/views/journey/JourneyPage.vue` |
| `src/components/jour/mytravel.vue` | `src/views/journey/TripDetailPage.vue` |
| `src/views/picture.vue` | `src/views/gallery/GalleryPage.vue` |
| `src/components/picture/sanya.vue` | `src/views/gallery/RegionGalleryPage.vue` |
| `src/components/picture/pictures.vue` | `src/components/gallery/PhotoGrid.vue` |
| `src/components/jour/jour.vue` | `src/components/journey/TripList.vue` |
| `src/views/my.vue` | `src/views/profile/ProfilePage.vue` |
| `src/views/map.vue` | `src/views/map/MapPage.vue` |
| `src/components/{BgLayout,StatusBar,Tabbar}.vue` | `src/components/layout/` 下的同名文件 |
| `src/api/auth.js`、`src/utils/request.js` | `src/api/auth.ts`、`src/api/client.ts` |
| `src/utils/session.ts` | `src/stores/session.ts` |
| `server/env.js`、`server/db.js` | `server/config/env.js`、`server/database/index.js` |
| `CODE_REVIEW.md` | `docs/CODE_REVIEW.md` |

## 审查结果与兼容性

- `src/components/icons/mytravel` 中 24 张图片均与 `assets` 中对应图片 SHA-256 一致，且无源码引用；去掉重复副本，保留资源目录中的原件。
- 未使用的 `counter.ts` 和 `com.css` 最初移入归档；后续按要求彻底删除归档目录、示例和旧样式。
- 相册列表和详情的目的地信息改为共用数据，保留本次实现的点击卡片选择照片功能。
- API 和照片卡片改用共享明确类型，移除原来将所有 Vue 文件、认证接口笼统声明为 `any` 的兜底声明。
- 页面按需加载，聊天和地图依赖不再全部包含在入口 JavaScript 中。
- 是否显示底部导航改由路由的 `hideTabbar` 元信息管理，避免 App 中再维护一份 URL 列表。
- 路由 URL、路由名称、API 地址、后端启动命令、`.env` 位置、`server/wander.db` 位置保持兼容。
- `src/views/hsw.vue` 在本次检查时已不存在；未恢复用户移除的练习文件。
- `dist`、数据库和本地密钥文件没有搬迁。

## 未使用资源清理

- 核对模板中的静态引用、脚本 import、绑定图片数据、CSS 资源及动态加载方式后，删除 26 张未引用的图片，共 737,163 字节，保留页面正在使用的 21 张图片。
- 删除未使用的搜索/语音图标、旧行程图标和缩略图、旧底部装饰图片，以及清空后的资源目录。
- 删除归档中的 Pinia 计数器和旧页面样式；移除 Pinia 初始化及依赖。当前账号状态由 `stores/session.ts` 的 Vue 响应式变量管理。
- 没有 JSX 页面，也未启用 Vue DevTools 插件；移除对应配置、直接依赖和不再需要的间接依赖。
- 删除没有引用的 `Credentials` 类型、多余的组件公开数据以及未使用的模板颜色变量。
- 保留后端、测试、图片上传占位框和用户照片预览代码。用户选择的照片是运行时数据，不属于静态资源清理范围。

验证命令：`npm run build`、`npm test --prefix server`、`npm run test:dev`。

新增 `npm run test:ui`，使用手机尺寸的隐藏浏览器验证实际 Home 点击、新增相册、照片选择及刷新恢复。Home 导航使用命名路由，已验证会话在 60 秒以内且令牌尚未过期时无需重复请求鉴权；首次打开仍由服务器验证，后端 API 始终独立鉴权。根地址 `/` 跳转到 `/home`，未登录用户由守卫转到登录页。
