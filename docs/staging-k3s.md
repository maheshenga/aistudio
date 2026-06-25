# Staging on k3s（Paid-Beta G1）

**推荐入口（一条命令）：**

```powershell
cd E:\code\aistudio
Copy-Item .env.deploy.example .env.deploy   # 首次：填密钥
# CORS_ORIGINS=http://127.0.0.1:30080

.\scripts\k3s-staging.ps1
```

| 场景 | 命令 |
|------|------|
| k3s 在 **WSL**，Docker 也在 WSL | `.\scripts\k3s-staging.ps1 -WslImport` |
| 镜像已导入，只部署+冒烟 | `.\scripts\k3s-staging.ps1 -SkipBuild` |
| 本机 k3s + `k3s ctr` | `.\scripts\k3s-staging.ps1 -ImportToK3s` |

## 访问

| 服务 | URL |
|------|-----|
| Web | http://127.0.0.1:30080 |
| API | http://127.0.0.1:30400 |

Cohort 通知里把上述地址写给内测用户（或换成节点 LAN IP）。

## 故障

| 现象 | 处理 |
|------|------|
| `ImagePullBackOff` | WSL: `bash scripts/k3s-import-wsl.sh`；或 `k3s-build-images.ps1 -ImportToK3s` |
| CORS 错误 | `.env.deploy` 的 `CORS_ORIGINS` 必须含 Web 的 origin |
| 浏览器调 API 404 | 重建 web：`k3s-build-images.ps1 -PublicApiUrl http://127.0.0.1:30400` |
| `kubectl` 连不上 | 设置 `KUBECONFIG`（k3s 通常在 `/etc/rancher/k3s/k3s.yaml`） |

## 与 Compose

Compose 仍可用 `.\scripts\staging-verify.ps1`；**G1 验收标准相同**：`npm run test:staging-verify`。

清单文件：`namespace.yaml`、`postgres*.yaml`、`api.yaml`、`web.yaml`。