# 在线密码生成器

一个部署在 Cloudflare Pages 上的纯前端密码生成器。默认规则基于 2026-07-15 的 Chromium 实现：生成 15 位密码，至少包含一个小写字母、一个大写字母和一个数字，默认不使用符号，并排除 `l/I/1/O/0/o` 等容易混淆的字符。

密码使用浏览器 Web Crypto API 在本地生成，不会上传、持久化或发送给任何服务。最近生成记录仅存在当前页面内存中，刷新后即清除。

> 本项目不是 Google 或 Chrome 官方产品。Chrome 是 Google LLC 的商标。

## 本地开发

需要 Node.js 22.12 或更高版本。

```bash
npm install
npm run dev
```

## 验证与构建

```bash
npm test
npm run typecheck
npm run build
```

生产文件输出到 `dist` 目录。

## 部署到 Cloudflare Pages

1. 在 Cloudflare Dashboard 中打开 **Workers & Pages**，选择 **Create application → Pages → Connect to Git**。
2. 授权 GitHub 并选择 `anka-io/password-generator` 仓库。
3. 生产分支选择 `main`。
4. Framework preset 选择 **React (Vite)**，或手动填写：
   - Build command：`npm run build`
   - Build output directory：`dist`
   - Root directory：留空
5. 不需要设置环境变量，保存后开始首次部署。

此后推送到 `main` 会自动更新生产站点，其他分支会生成预览部署。

## 规则来源

- [Chromium password_generator.cc](https://chromium.googlesource.com/chromium/src/+/HEAD/components/password_manager/core/browser/generation/password_generator.cc)
- [Cloudflare Pages 构建配置](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Cloudflare Pages Git 集成](https://developers.cloudflare.com/pages/get-started/git-integration/)

## 许可证

[Apache License 2.0](LICENSE)
