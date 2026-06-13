# AI Multi-Agent Workspace SaaS PRD

## 1. Product Summary

### Product Name

个人 AI 助手 - 多 Agent 架构工作站

### Product Positioning

面向超级个体、小型团队、本地生活商家、电商操盘手和内容创业者的一体化 AI 经营工作台。产品把内容生产、商品素材生成、视频混剪、数字人分身、私域客户、门店经营、团队协作、财务税务和系统权限整合到同一个 SaaS 面板中。

### Current Repository Evidence

- Frontend entry: `src/main.tsx` renders `App` inside `ThemeProvider` and `UndoRedoProvider`.
- Application shell: `src/App.tsx` owns active module state, sidebar/topbar layout, split-screen state, pinned modules, modals, and module rendering.
- Product navigation source: `src/product/registry.ts` defines 14 navigation groups, 67 visible feature entries, and hidden/internal compatibility records used by routing.
- Module contract: `src/types.ts` defines the `ModuleId` union used by navigation and content rendering.
- Module rendering: `src/App.tsx` maps each `ModuleId` to feature components in `renderContent`.

## 2. Goals And Non-Goals

### Goals

- Provide one workspace for AI-assisted business operations.
- Let users move from idea to asset, campaign, customer follow-up, store operation, and financial review without switching products.
- Support multi-Agent status, dispatch, task scheduling, and audit visibility.
- Turn the existing AI Studio panel into a deployable SaaS product with clear product domains, plans, permissions, data ownership, and monetization hooks.
- Preserve the current broad feature surface while prioritizing a coherent MVP.

### Non-Goals For MVP

- Build every AI model pipeline as a fully automated production backend in the first release.
- Replace specialist tools such as full ERP, full CRM, professional video editors, or accounting systems.
- Support enterprise-grade custom workflow scripting in MVP.
- Support marketplace plugins before core workspace, account, billing, and asset persistence are stable.

## 3. Target Users

### Primary Personas

1. Solo Founder / 超级个体
   - Needs one operating cockpit for content, customers, products, and tasks.
   - Values speed, templates, AI assistance, and low setup cost.

2. 电商操盘手
   - Needs main images, product videos, detail pages, posters, copy, and campaign assets.
   - Values high-volume generation, batch export, platform adaptation, and brand consistency.

3. 本地生活 / 小店群主理人
   - Needs store dashboards, orders, inventory, activities, lead capture, and mini app management.
   - Values simple dashboards, staff/task coordination, and promotion automation.

4. 内容团队 / 轻量 MCN
   - Needs video remixing, script generation, avatar content, social account matrix, and collaboration.
   - Values workflow templates, asset reuse, approvals, and audit logs.

### Secondary Personas

- Finance/admin user: monitors bills, token usage, invoices, tax tools, and permissions.
- Developer/operator: configures API keys, integrations, Firebase/backend, model providers, and audit settings.

## 4. Product Information Architecture

The product has 14 top-level domains and 67 visible features.

### Domain 1: 我的 Agent 看板

Purpose: Give the user a command center for AI agents, task flow, and operating status.

Features:

- 全域指挥概览
- Agent 集群状态
- 全局任务调度
- Agent 状态监测

Expected capabilities:

- Workspace KPIs, agent health, active work, daily focus, activity timeline.
- Agent topology and current workload.
- Global task queue and scheduling.
- Agent latency, completion rate, error state, and resource usage.

### Domain 2: 主理人：电商操盘

Purpose: Generate and manage e-commerce selling assets.

Features:

- 主图设计
- 商品视频
- 详情页设计助理
- 创意海报
- AI 图像编辑
- 克隆设计

Expected capabilities:

- Product input form: product name, selling points, platform, aspect ratio, batch count.
- Text-to-image, image-to-image, text-to-video, and image-to-video flows.
- Marketplace-specific presets for Taobao/Tmall, Douyin, Xiaohongshu, JD, Pinduoduo, and similar channels.
- Reference upload, product upload, style selection, lighting, angle, tone, and preview.
- Export generated assets and SEO metadata.

### Domain 3: 主理人：无界创作

Purpose: Offer general creative AI tools outside one commerce scenario.

Features:

- 视频创作引擎
- 商用级图像生成
- 无限模态 AI 画布
- 全能顾问对话
- 多语种语音引擎

Expected capabilities:

- AI video generation workspace.
- Image generation workspace.
- Multimodal canvas for arranging text, images, references, outputs, and iterations.
- General AI chat/copilot.
- Speech generation, voice selection, transcript, and multilingual output.

### Domain 4: 主理人：文案营销

Purpose: Produce, rewrite, classify, and manage marketing copy.

Features:

- 文案创作
- 创作工具
- 关键词库

Expected capabilities:

- Draft copy from prompt, product, audience, tone, and channel.
- Platform adaptation for Xiaohongshu, Douyin, WeChat, landing pages, and ads.
- Tools for titles, hooks, translation, expansion, style transfer, and polishing.
- Keyword library for brand vocabulary, SEO, campaign tags, and banned words.

### Domain 5: 主理人：视频工业

Purpose: Manage short-video production and remix workflows.

Features:

- 混剪首页
- 智能混剪
- 爆款视频复刻
- 混剪素材
- 标题模板
- 视频模板

Expected capabilities:

- Remix dashboard with project shortcuts.
- Timeline-like smart remix builder.
- Viral video analysis and structure replication.
- Materials library for video, audio, subtitles, and effects.
- Title templates and video templates for repeatable workflows.

### Domain 6: 主理人：分身直播

Purpose: Manage AI avatar and voice assets for livestream and video output.

Features:

- 分身管理
- 克隆声音与形象
- 声音资产
- 数字人空间

Expected capabilities:

- Avatar list and status.
- Voice/image cloning workflow.
- Voice asset library.
- Digital human workspace for scripts, scenes, live preview, and generated outputs.

### Domain 7: 主理人：私域与客户

Purpose: Manage customer relationships and AI customer service.

Features:

- 智能客户管家 (CRM)
- 全天候 AI 客服

Expected capabilities:

- Customer profiles, tags, notes, lifecycle, and relationship graph.
- AI customer insights and comments.
- Service inbox, intent classification, response suggestions, and escalation.
- Follow-up tasks and CRM automation.

### Domain 8: 大航海：全域裂变

Purpose: Drive campaign distribution, lead capture, and lightweight growth funnels.

Features:

- 爆店码
- 碰一碰
- 智能官网

Expected capabilities:

- QR-based campaign code creation and tracking.
- NFC-style touch campaign entry.
- Landing page / smart website builder.
- Campaign list, scan/share/exposure metrics, and page publishing states.

### Domain 9: 导演台与分镜流

Purpose: Provide a command desk for video/scene planning.

Features:

- 全局导演台

Expected capabilities:

- Scene planning, shot breakdown, script board, asset references, and production checklist.
- Agent-assisted storyboard generation and creative decisions.

### Domain 10: 主理人：包揽设计

Purpose: Generate business design assets across brand, product, ads, space, and fashion.

Features:

- 智能 LOGO
- AI 包装设计
- 广告创意
- AI 家装设计
- AI 服装设计

Expected capabilities:

- Shared design workflow with module-specific prompts and parameters.
- Canvas and workflow modes.
- Undo/redo support through shared context.
- Export and save generated proposals.

### Domain 11: 我的数字资产库

Purpose: Centralize operational data, digital assets, and brand knowledge.

Features:

- 业务数据罗盘
- 数字资产保险库
- 品牌知识库

Expected capabilities:

- Business analytics and usage dashboards.
- Asset vault for generated and uploaded media.
- Brand knowledge base for prompts, tone, products, customer rules, and reusable references.

### Domain 12: 虚拟数字员工

Purpose: Manage AI/team member roles, collaboration, accounts, and approval workflows.

Features:

- 数字员工概览
- 分发矩阵账号
- 人机推演协作
- 异步协同任务
- 共享给 Agent 的库
- 主理人审批流

Expected capabilities:

- Team/agent overview.
- Social distribution account matrix.
- Human-AI co-writing or simulation workspace.
- Async task assignment and status.
- Shared resources for agents.
- Approval queue for owner review.

### Domain 13: 云连锁与小店群

Purpose: Manage multi-store operations and local commerce growth.

Features:

- 多店全盘看板
- 门店官网与分店
- 统一订单管理
- 智能调拨与库存
- 门店网页设计
- 虚拟导购与巡店
- 自动营销策略
- 分销代理网络
- 活动与引流
- 小程序端管理

Expected capabilities:

- Multi-store KPI dashboard.
- Store list and branch page management.
- Order management.
- Inventory transfer and stock alerts.
- Store web page builder.
- Virtual shopping assistant and inspection workflow.
- Automated promotions.
- Distributor/affiliate network.
- Events, coupons, and lead capture.
- Mini app operations.

### Domain 14: 系统引擎与权限

Purpose: Operate SaaS settings, usage, finance, compliance, and audit.

Features:

- 社媒矩阵挂载
- 兼职员工账号池
- 算力与 Token 监控
- API 密钥与开发者
- 全局偏好配置
- 系统管理
- 财务与票据管理
- 税务筹划与计算
- 全站操作审计日志

Expected capabilities:

- Social media account integration.
- External worker/sub-account management.
- Billing, token, and compute monitoring.
- API key management.
- Global preferences and personalization.
- Admin settings and permissions.
- Finance and invoice management.
- Tax calculation/planning tools.
- Activity/audit logs.

## 5. Core Product Workflows

### Workflow A: Daily Operating Cockpit

1. User opens dashboard.
2. Product shows agent status, focus goal, recent files, activity, recommended modules, and task queue.
3. User jumps to a pinned module or starts a global agent dispatch.
4. System records module usage and activity.

### Workflow B: E-Commerce Asset Generation

1. User selects product asset type.
2. User enters product name, selling points, platform, style, aspect ratio, and references.
3. System generates batch assets or previews.
4. User edits, exports, saves to asset vault, or pushes into campaign/site/store flows.

### Workflow C: Video Remix Production

1. User starts from remix dashboard or viral replication.
2. User uploads/reference materials.
3. System maps hook, product proof, subtitle, music, aspect ratio, cover, and watermark settings.
4. User generates or exports a video package.

### Workflow D: Customer And Campaign Loop

1. User collects leads through CRM, campaign code, NFC, website, or customer service.
2. System tags customers and generates follow-up recommendations.
3. User or AI agent triggers marketing copy, service reply, coupon, or store event.
4. Activity is logged for audit and future analytics.

### Workflow E: Multi-Store Operations

1. User views multi-store dashboard.
2. User drills into orders, inventory, staff, promotions, distribution, events, or mini app.
3. System surfaces exceptions and recommended actions.
4. User dispatches tasks to employees or agents.

## 6. MVP Scope

### MVP P0

P0 is the minimum SaaS product that can be used repeatedly by a real owner.

- Authentication and workspace tenancy.
- Persistent dashboard, module navigation, pinned modules, and layout presets.
- Asset vault with upload, generated asset records, tags, and export.
- E-commerce asset generation flow for main image, poster, detail-page helper, clone design, and image editing.
- Copywriting creation/tools/keyword library.
- AI chat/copilot as cross-module assistant.
- Billing/token usage dashboard.
- API key/settings page.
- Activity logs and basic audit trail.

### MVP P1

- Video remix suite.
- Avatar and voice asset management.
- CRM and AI customer service.
- Smart website / campaign pages.
- Team/agent task queue and approval flow.
- Store dashboard, order, inventory, and marketing pages.

### MVP P2

- Finance and tax automation.
- Multi-store mini app management.
- Distribution/affiliate network.
- Full digital employee orchestration.
- Advanced developer APIs and plugin marketplace.
- Enterprise audit, role-based permission templates, and compliance exports.

## 7. Data Model Draft

### Core Entities

- `Workspace`: tenant, plan, owner, settings.
- `User`: profile, role, permissions, status.
- `Agent`: persona, capability tags, status, workload, latency.
- `ModuleUsage`: module id, duration, user, timestamp.
- `Task`: owner, assignee, agent, status, priority, due date, source module.
- `Asset`: type, source, prompt, file, tags, linked project, export history.
- `Project`: brand, campaign, product, store, or video project.
- `Customer`: profile, tags, source, notes, service history.
- `Campaign`: QR/NFC/site campaign, metrics, assets, landing pages.
- `Store`: branch info, metrics, orders, inventory.
- `Order`: customer, store, items, status, value.
- `Invoice`: finance record, file, tax fields, status.
- `ApiKey`: provider, scope, status, owner.
- `AuditLog`: actor, action, module, target, metadata, timestamp.

### AI-Specific Entities

- `GenerationJob`: module, prompt, parameters, provider, status, cost, outputs.
- `PromptTemplate`: module, type, version, variables, owner.
- `KnowledgeItem`: brand docs, product facts, policies, vector metadata.
- `VoiceAsset`: speaker, consent status, model id, sample files.
- `AvatarAsset`: image/video references, model status, output channels.

## 8. Integration Requirements

### Required Integrations

- Gemini / model provider API for AI generation and chat.
- Firebase or production backend for realtime/persistent data.
- Object storage for generated and uploaded assets.
- Billing/token accounting.

### Optional Integrations

- Social media account providers.
- E-commerce platforms.
- WeChat mini app / official account.
- Payment and invoice providers.
- SMS/email/push notifications.

## 9. Permissions

### Suggested Roles

- Owner: all permissions, billing, keys, audit, exports.
- Admin: workspace management, users, modules, data.
- Operator: content, CRM, campaigns, stores, tasks.
- Creator: asset generation, copy, video, design.
- Finance: billing, invoices, tax, financial records.
- Viewer: read-only dashboards and approved assets.

### Permission Categories

- Module access.
- Asset create/edit/delete/export.
- Customer data access.
- Store/order data access.
- Billing and API key access.
- Agent dispatch and approval.
- Audit log access.

## 10. Monetization

### Plans

- Starter: one workspace, limited modules, limited monthly AI credits.
- Pro: full creator/e-commerce modules, higher credits, asset vault, CRM basics.
- Business: team collaboration, store suite, approval flows, audit logs.
- Enterprise: SSO, custom roles, compliance exports, dedicated model/provider config.

### Billable Units

- Seats.
- AI credits / token usage.
- Storage.
- Video generation minutes.
- Avatar/voice cloning quota.
- Store count.
- API usage.

## 11. Acceptance Criteria

### Product Structure

- All 67 visible features appear in a maintained product registry.
- Each feature has an owner domain, route/module id, component, release phase, data dependencies, and permission scope.
- Sidebar navigation and route rendering are generated from or validated against the same registry.

### MVP Usability

- User can open dashboard, pin modules, navigate features, and return to the last used state.
- User can create and save at least one generated asset record.
- User can create and complete at least one task.
- User can view token/billing usage.
- User can view audit logs for meaningful operations.

### Technical

- `npm run lint` passes.
- `npm run build` passes.
- Local smoke test returns HTTP 200 and renders non-empty dashboard content.
- No missing route exists for a visible sidebar item.
- No visible route renders only the generic "under development" fallback in MVP P0.

### SaaS Readiness

- Secrets are not committed.
- Workspace/user/account boundaries exist.
- Generated assets and tasks persist across reloads.
- Audit logs include actor, module, action, target, and timestamp.
- Billing/token usage is visible per workspace.

## 12. Known Gaps From Current Code Inspection

- `e_white_bg` exists in `ModuleId` and e-commerce component flags, but is not a visible sidebar item and is not mapped in `App.renderContent`.
- `marketing_diy` is rendered by `App.renderContent`, but it is not present in the visible sidebar groups.
- Several modules appear frontend-heavy and should be classified as real, mocked, or placeholder before production planning.
- Backend data contracts are not yet centralized in this PRD; they need a separate API/data-model specification.
- Current navigation registry and route switch are separate structures, which increases drift risk.

## 13. Success Metrics

### Activation

- 70% of new workspaces complete at least one asset generation or copywriting task within the first session.
- 50% of new workspaces pin at least two modules within the first day.

### Engagement

- Weekly active workspace rate >= 45%.
- Average weekly module usage >= 5 modules per active workspace.
- Asset reuse/export rate >= 30% of generated outputs.

### Business

- Free-to-paid conversion >= 8% for creator/e-commerce users.
- Paid workspace retention at 90 days >= 55%.
- Average paid workspace uses at least 40% of included monthly AI credits.

### Reliability

- P95 dashboard load under 2.5 seconds on production build.
- AI job completion success >= 95%.
- Audit log write success >= 99.9%.

## 14. Release Plan

### Phase 0: Product Registry And SaaS Shell

- Create central product registry for all 67 visible features.
- Align sidebar, command palette, search, route rendering, permissions, and docs with the registry.
- Add workspace/user/auth shell.

### Phase 1: Creator And E-Commerce MVP

- Ship dashboard, asset vault, e-commerce asset generation, copywriting, image generation/editing, chat/copilot, billing, settings, audit logs.

### Phase 2: Collaboration And Customer Loop

- Ship CRM, AI customer service, tasks, agent status, approvals, and campaign pages.

### Phase 3: Video, Avatar, And Store Suite

- Ship remix production, avatar/voice management, multi-store dashboard, order/inventory/store marketing.

### Phase 4: Finance, Tax, API, And Enterprise Controls

- Ship finance/tax, developer API keys, advanced permissions, compliance exports, and enterprise packaging.

## 15. Open Decisions

- Should the first commercial wedge be "AI 电商内容工作台" or "超级个体 AI 经营中台"?
- Which model provider should be production default: Gemini only, multi-provider, or BYOK?
- Should Firebase remain the production backend or become a prototype-only integration?
- What data is legally required for voice/avatar cloning consent?
- Which modules should be hidden until they are beyond demo/mock state?
- Should store operations target small local shops first or e-commerce sellers with multiple online stores?
