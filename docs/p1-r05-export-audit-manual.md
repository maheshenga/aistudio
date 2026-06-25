# P1-R05 导出计费与审计 — 人工验收

Updated: 2026-06-26  
自动化：`recordWorkspaceAssetExport` + `pricingAction: 'export'`（launch-readiness 覆盖 Copywriting / Remix / Image / Video / ECommerce / FeatureView）

## 抽样模块（≥3）

任选其三完成下表：

| 模块 | 导出动作 | 通过 |
|------|----------|------|
| `copywriting_create` | 复制/分享或导出文案 | [ ] |
| `image` | 导出图像 | [ ] |
| `remix_smart` | 导出混剪成品 | [ ] |
| `e_main_image` | 导出主图 | [ ] |

## 每模块检查

1. [ ] 导出成功（文件或记录生成）
2. [ ] **算力与 Token 监控**：出现 export 类 usage（含 `pricingAction: export` 或 export credits）
3. [ ] **审计日志**：`asset_export` 或等价 action，含 `format` / `fileName` 等 metadata

## 通过标准

三模块均满足 usage + audit 双可见。

Sign-off: __________ / 日期 __________