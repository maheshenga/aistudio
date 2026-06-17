# ⑤b-4 加密敏感资源设计规格

状态:已批准(2026-06-18)
所属:SaaS 产品化 ⑤ 业务模块补全 / ⑤b 数据层迁移 / ⑤b-4(加密敏感批,⑤b 最后一批)

## 背景

apiKey、webhook 两个 local-only repository 存储对外 API 凭据(第三方 API key、webhook 签名密钥)。这是用户在后台填入的、后端将来需要拿去调用外部服务/签名的凭据。

调研确认(见对话记录,带文件引用):

- **现状是"生成→展示一次→丢原文"**:`apiKeyRepository.ts`/`webhookRepository.ts` 创建时生成 secret,只在创建返回值里给用户看一次,localStorage 只存 `last4` + 占位 ref 字符串(`api_key_xxx_last4_ts` / `webhook_secret_xxx_last4_ts`),**原文当场丢弃**。
- **后端目前无任何对称加密能力**:全仓只有 `token.service.ts` 用 `createHash`/`randomBytes` 做 refresh token 哈希,无 `createCipheriv`/AES/EncryptionService。
- **media/payment 的 credentialRef 是纯占位符**,没有任何加密,只是脱敏丢弃原文。本批是反面:要真加密、可解密自用。
- **后端不用 ConfigModule,直接 `process.env` 裸读**,`JWT_SECRET` 在 `main.ts` fail-fast 校验。
- **`common/` 下 PrismaModule 是唯一 `@Global()` 范例**,EncryptionService 照此模式全局可注入。
- webhook secret 现用 `Math.random()` 生成(非密码学安全),迁移时修为 `crypto.getRandomValues`。

## 决策(已与用户对齐)

1. **语义改为 C 方向:后端持久化 AES-256-GCM 密文,明文永不流出后端。** 用户填明文 → 前端 HTTPS POST 明文给后端 → 后端加密落库 → 以后后端解密自用。
2. **无"取回明文"端点**:前端永远只见 `last4`/`preview`。用户填错只能重填。无明文出口,安全面最小。
3. **本批只做安全存取基础设施**:建完整加解密能力(EncryptionService + 加密落库 + 内部 decrypt 方法 + round-trip 单测验证),**不接任何业务消费方**(代发 webhook、调外部 API 留未来专门立项)。decrypt 方法先建好并单测,暂无业务调用方。
4. **密文存储形态**:每个敏感字段一列存密文字符串,格式 `iv:authTag:ciphertext`(全 hex 三段)。apiKey 表加 `secretCiphertext String?`,webhook 表加 `signingSecretCiphertext String?`。不建集中密文表(YAGNI)。
5. **密钥注入**:新增 env `FIELD_ENCRYPTION_KEY`(64 位 hex = 32 字节,AES-256 所需),照 `JWT_SECRET` 模式在 `main.ts` fail-fast,EncryptionService constructor 校验长度。测试环境注入固定 64-hex 测试 key。
6. **webhook secret 仍前端生成**(走 A):把不安全的 `Math.random` 换成 `crypto.getRandomValues`,POST 明文给后端加密存。不引入"创建响应回传明文"的新出口。与整个 ⑤b"保持现有语义、最小改动"一致。

## 组件 1:EncryptionService(本批核心新增)

位置 `apps/api/src/common/encryption/`,照 PrismaModule 模式:

- `encryption.module.ts`:`@Global() @Module({ providers: [EncryptionService], exports: [EncryptionService] })`,在 `app.module.ts` imports 与 PrismaModule 同级加入。各业务模块无需单独 import,直接 constructor 注入。
- `encryption.service.ts`:`@Injectable`,constructor 读 `process.env.FIELD_ENCRYPTION_KEY`,校验为 64 位 hex(32 字节),不符抛错。
  - `encrypt(plaintext: string): string` → `aes-256-gcm` + `randomBytes(12)` IV,返回 `iv:authTag:ciphertext`(全 hex 三段)。
  - `decrypt(payload: string): string` → 解析三段,GCM 验 authTag 还原明文;authTag 失败抛错(防篡改)。
- `main.ts` 启动 fail-fast:缺 `FIELD_ENCRYPTION_KEY` 拒绝启动(照 JWT_SECRET)。
- `.env.example` 加一行 + `openssl rand -hex 32` 生成说明。

## 组件 2:apiKey 后端资源

- Prisma `ApiKey` 模型:`id, workspaceId, name, prefix, last4, keyPreview, secretCiphertext String?, status, lastUsedAt DateTime?, expiresAt DateTime?, metadata Json?, createdAt, updatedAt` + `@@index([workspaceId, createdAt])`。无 userId(前端 context 无 userId)。Workspace 加反向关系 `apiKeys ApiKey[]`。
- 四件套(dto/service/controller/module),套 `WorkspaceResourceService` + `createResourceController`(list 资源,与 ⑤b-1 同构)。
- **写入流程**:POST body 带明文 `secret` → service 落库前 `encryption.encrypt(secret)` 存进 `secretCiphertext`,派生 `last4`/`keyPreview`,**明文 secret 绝不落库**。
- **读取流程**:list/get 返回 DTO 不含 `secretCiphertext`(service 显式 omit),前端只见 last4/preview。
- rotate 的轮换语义(旧 key 置 rotating + expiresAt grace period)保留前端逻辑,后端只是又一次 create + update status。

## 组件 3:webhook 后端资源

- Prisma `WebhookEndpoint` 模型:`id, workspaceId, name, url, status, events String[], signingSecretCiphertext String?, signingSecretLast4, lastDeliveredAt DateTime?, failureCount Int @default(0), metadata Json?, createdAt, updatedAt` + `@@index([workspaceId, createdAt])`。Workspace 加反向关系 `webhookEndpoints WebhookEndpoint[]`。
- 同样四件套套基类。写入加密 `signingSecret` → `signingSecretCiphertext`,读取剥离密文只回 last4。
- webhook secret 生成留前端(`crypto.getRandomValues` 替换 `Math.random`),POST 明文给后端加密存。

## 组件 4:前端改造(两个 repository)

照已验证写穿透模板(creditRepository/financial 同款):

- 加 import apiClient、模块级 `Map` 缓存、`hydrateWorkspaceApiKeys` / `hydrateWorkspaceWebhookEndpoints`(configured GET 写缓存)、`__set...ApiClientForTest`。
- **create**:configured 时明文 secret 放进 POST body 发后端(后端加密),响应只回 last4/preview/ref → 更新缓存。明文 secret 仍按现状只在前端创建返回值里给用户看一次,**不再写 localStorage**。
- **list/update/delete**:configured 读缓存 + 写穿透 POST/PATCH/DELETE。
- **未配置后端时**:localStorage 全量逻辑零改动(含现有 secret 生成,只把 `Math.random` 修成 `crypto.getRandomValues`)。
- rotate/grace-period 派生逻辑保留前端。

## 错误处理与测试

- **EncryptionService 单测**(新增):round-trip(encrypt→decrypt 还原)、authTag 篡改检测(改一字节 decrypt 抛错)、错误 key 长度 constructor 抛错。本批加密能力核心验证。
- **后端 e2e**:apiKey + webhook 各一 spec —— create 后直接查 DB 断言 `secretCiphertext`/`signingSecretCiphertext` 非空且非明文、list/get **不回传密文字段**、跨租户 403、whitelist 400。
- **前端**:`scripts/api-key-repository.test.ts` / `scripts/webhook-repository.test.ts` —— hydrate 读缓存、create 写穿透 POST、未配置 localStorage 兜底。挂 `test:p0-specialized` 链尾。
- **全量验收**:后端 e2e(预期 30 suites)、lint、build、test:p0-specialized、test:saas-foundation 全绿。

## 不做(超出本批)

- 不实现任何业务消费方(代发 webhook、调外部 API)。
- 不做密钥轮换(`FIELD_ENCRYPTION_KEY` rotation)——单 key,留运维/未来。
- 不加"取回明文"端点。
- 不改任何 apiKey/webhook 调用方组件(行为不变)。
