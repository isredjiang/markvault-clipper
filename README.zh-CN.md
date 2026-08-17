# MarkVault Clipper

MarkVault Clipper 是一个自托管 Markdown 网页剪藏工具，适合保存网页文章到
Obsidian 风格的本地库。它不绑定 Ignis：只要目标应用能打开同一个库，就能看到
剪藏后的 Markdown 文件。

![MarkVault Clipper 图标](extension/icons/icon128.png)

## 它由两部分组成

- `extension/`：Chromium/Edge 浏览器扩展。负责在浏览器中提取正文、转换
  Markdown、预览、复制、下载 Markdown，并把最终 Markdown 发给服务端。
- `server/`：轻量 Node.js API 服务端。负责校验令牌、检查库名称、创建剪藏和
  资源文件夹、写入 Markdown 文件，并按需下载图片等资源。

## 工作流程

```text
浏览器扩展
  -> Readability 提取正文
  -> Turndown/GFM 转换 Markdown
  -> MarkVault Clipper 服务端 API
  -> /vaults/<库名称>/<剪藏路径>/*.md
  -> /vaults/<库名称>/<资源路径>/*
  -> Obsidian/Ignis 等应用看到新文件
```

## 弹窗体验

- URL、令牌、语言放在弹窗底部，不需要额外设置页。
- 模板直接在弹窗保存；没有“新增模板”按钮，输入新模板名并保存就是新模板。
- 删除最后一个模板时会回到初始默认模板。
- 库名称默认留空，不会带任何个人库名。
- 剪藏路径和资源路径默认以灰色 placeholder 显示：
  `_webClipper` 和 `_webClipper/assets`。
- 标签可以留空，Markdown 仍会输出 `tags: []`。
- `下载资源` 默认关闭。
- `预览 Markdown` 后会出现 `复制 Markdown`。
- `下载 Markdown` 直接使用浏览器默认下载位置，不需要服务端。
- 语言选择支持简体中文和英文界面。

## Docker 部署

复制 `server/config.example.json` 为 `server/config.json`，至少修改：

```json
{
  "host": "0.0.0.0",
  "port": 3217,
  "token": "use-a-long-random-token",
  "vaultsRoot": "/vaults"
}
```

运行 Compose 前请先把 `config.json` 创建成真正的文件。如果宿主机路径不存在，
Docker 可能会把 `config.json` 自动创建成目录，旧版本会因此报 `EISDIR`。

```text
mkdir -p server
cp server/config.example.json server/config.json
```

使用已发布镜像：

```text
docker pull isredjiang/markvault-clipper:latest
```

同一个镜像也会发布到 GHCR：

```text
docker pull ghcr.io/isredjiang/markvault-clipper:latest
```

也可以本地构建镜像：

```text
docker build -t markvault-clipper .
```

示例 Compose：

```yaml
services:
  markvault-clipper:
    image: isredjiang/markvault-clipper:latest
    container_name: markvault-clipper
    environment:
      - CLIPPER_CONFIG=/app/server/config.json
    volumes:
      - ./server/config.json:/app/server/config.json:ro
      - /path/to/obsidian-vaults:/vaults
    ports:
      - "3217:3217"
    restart: unless-stopped
```

`3217:3217` 会把服务端口暴露到宿主机所有网卡。公网部署时建议配合 HTTPS 反向代理、防火墙或访问控制使用。

部署后访问：

```text
https://clipper.example.com/
```

如果看到 `MarkVault Clipper API 连接成功。`，说明服务端已经连通。

## 开发

```text
npm install
npm run build:extension
```

本地调试时在 Edge/Chrome 扩展管理页加载 `extension/` 文件夹。正式发布时压缩
`extension/` 目录内容即可。
