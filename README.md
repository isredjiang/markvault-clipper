# MarkVault Clipper

[简体中文](README.zh-CN.md) | [English](README.en.md)

MarkVault Clipper is a self-hosted Markdown web clipper for Obsidian-style
vaults. It ships as a Chromium/Edge browser extension plus a small Docker API
server.

MarkVault Clipper 是一个自托管 Markdown 网页剪藏工具，面向 Obsidian 风格的
本地库。它由一个 Chromium/Edge 浏览器扩展和一个轻量 Docker API 服务端组成。

![MarkVault Clipper icon](extension/icons/icon128.png)

## Quick Start / 快速开始

```text
npm install
npm run build:extension
docker build -t markvault-clipper .
```

Load `extension/` as an unpacked extension in Edge/Chrome. Deploy the Docker
server behind HTTPS, mount your vault parent folder to `/vaults`, then fill the
server URL, token, vault name, clip folder, and assets folder in the popup.

在 Edge/Chrome 中以“加载解压缩的扩展”加载 `extension/`。将 Docker 服务端部署
到 HTTPS 后面，把你的库父目录挂载到 `/vaults`，然后在弹窗里填写服务端 URL、
令牌、库名称、剪藏路径和资源路径。

## Documentation / 文档

- [中文说明](README.zh-CN.md)
- [English README](README.en.md)
- [Install Guide](INSTALL.md)
- [Acceptance Checklist](ACCEPTANCE.md)
- [GitHub Pages landing page](docs/index.html)
- License: MIT
