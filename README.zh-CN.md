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

普通 Docker 部署可以直接把基础参数写在 Compose 的 `environment` 里。
`config.json` 变成可选项，主要用于复杂模板或针对不同网站的规则。

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
      - MARKVAULT_TOKEN=use-a-long-random-token
    volumes:
      - /path/to/obsidian-vaults:/vaults
    ports:
      - "3217:3217"
    restart: unless-stopped
```

`3217:3217` 会把服务端口暴露到宿主机所有网卡。公网部署时建议配合 HTTPS 反向代理、防火墙或访问控制使用。

库名称、剪藏路径、资源路径和标签都会由浏览器扩展随每次剪藏一起发送。
服务端默认从 `/vaults` 下面找库，所以上面的目录挂载对普通部署已经够用。

### 环境变量

| 变量 | 必填 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `MARKVAULT_TOKEN` | 建议填写 | `change-me` | 服务端令牌。浏览器扩展里填写的令牌要和这里一致。公网部署一定要改成较长随机值。 |
| `MARKVAULT_HOST` | 否 | `0.0.0.0` | 服务监听地址。Docker 部署通常不用改。 |
| `MARKVAULT_PORT` | 否 | `3217` | 容器内部监听端口。一般改 compose 的端口映射即可，不需要改它。 |
| `MARKVAULT_VAULTS_ROOT` | 否 | `/vaults` | 笔记库根目录。标准挂载 `./vaults:/vaults` 时不用填。 |
| `MARKVAULT_DEFAULT_VAULT` | 否 | 空 | 默认库名称。通常由浏览器扩展前端填写，不需要在服务端固定。 |
| `MARKVAULT_DEFAULT_FOLDER` | 否 | `_webClipper` | 默认剪藏路径。前端会随请求发送，通常不需要填。 |
| `MARKVAULT_ASSETS_FOLDER` | 否 | `_webClipper/assets` | 默认资源路径。前端会随请求发送，通常不需要填。 |
| `MARKVAULT_DEFAULT_TAGS` | 否 | 空 | 服务端追加的默认标签，多个标签用英文逗号分隔。 |
| `MARKVAULT_LOCALIZE_IMAGES` | 否 | `true` | 是否默认下载图片资源。前端可以覆盖。可填 `true` 或 `false`。 |
| `MARKVAULT_IMAGE_LINK_MODE` | 否 | `wikilink` | 图片链接格式。可按需要保留默认值。 |
| `MARKVAULT_CORS_ORIGINS` | 否 | `*` | 允许跨域来源，多个来源用英文逗号分隔。一般反代后不用改。 |
| `MARKVAULT_MAX_BODY_BYTES` | 否 | `8388608` | 单次请求最大体积，默认 8 MB。 |
| `MARKVAULT_FILENAME_DATE_PREFIX` | 否 | `true` | 保存文件时是否自动加日期前缀。可填 `true` 或 `false`。 |

仍然支持挂载 JSON 配置文件。如果你要挂载 `config.json`，请先把它创建成真正的文件；
如果宿主机路径不存在，Docker 可能会把 `config.json` 自动创建成目录。

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
