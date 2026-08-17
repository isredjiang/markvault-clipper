# MarkVault Clipper

MarkVault Clipper is a self-hosted Markdown web clipper for Obsidian-style
vaults. It is not tied to Ignis: any app that opens the same mounted vault can
see the saved Markdown files.

![MarkVault Clipper icon](extension/icons/icon128.png)

## Pieces

- `extension/`: a Chromium/Edge extension. It extracts readable article content
  in the browser, converts it to Markdown, previews/copies/downloads Markdown,
  and sends the final Markdown to the server.
- `server/`: a small Node.js API. It verifies the token, checks the selected
  vault, creates clip/assets folders, writes Markdown files, and can download
  page resources into the vault.

## Flow

```text
browser extension
  -> Readability article extraction
  -> Turndown/GFM Markdown conversion
  -> MarkVault Clipper server API
  -> /vaults/<vault name>/<clip folder>/*.md
  -> /vaults/<vault name>/<assets folder>/*
  -> Obsidian/Ignis sees the new files
```

## Popup UX

- URL, token, and language live at the bottom of the popup.
- Templates are saved directly in the popup. There is no add-template button:
  saving a new template name creates it.
- Deleting the last template resets the popup to the initial template.
- Vault name is blank by default, so the project ships without personal data.
- Clip folder and assets folder show `_webClipper` and `_webClipper/assets` as
  grey placeholders.
- Tags can be empty. Markdown still writes `tags: []`.
- `Download resources` is off by default.
- `Preview Markdown` reveals `Copy Markdown`.
- `Download Markdown` uses the browser's default download location and does not
  require the server.
- The language selector supports Simplified Chinese and English.

## Docker

For a normal Docker deployment, put the basic settings directly in Compose. A
JSON config file is optional and mainly useful for advanced templates or
site-specific rules.

Use the published image:

```text
docker pull isredjiang/markvault-clipper:latest
```

The same image is also published to GHCR:

```text
docker pull ghcr.io/isredjiang/markvault-clipper:latest
```

Or build it locally:

```text
docker build -t markvault-clipper .
```

Example Compose:

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

`3217:3217` exposes the server on all host network interfaces. For public
deployments, use HTTPS, firewall rules, or your preferred access control.

The extension sends the vault name, clip folder, assets folder, and tags with
each clip. By default the server looks for vaults under `/vaults`, so the volume
mount above is enough for normal use.

### Environment Variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `MARKVAULT_TOKEN` | Recommended | `change-me` | Server token. The browser extension token must match this value. Use a long random value for public deployments. |
| `MARKVAULT_HOST` | No | `0.0.0.0` | Server listen host. Docker deployments usually do not need to change it. |
| `MARKVAULT_PORT` | No | `3217` | Internal container port. Usually change the Compose port mapping instead. |
| `MARKVAULT_VAULTS_ROOT` | No | `/vaults` | Root folder for vaults. Not needed with the standard `./vaults:/vaults` mount. |
| `MARKVAULT_DEFAULT_VAULT` | No | empty | Default vault name. Usually sent by the browser extension instead. |
| `MARKVAULT_DEFAULT_FOLDER` | No | `_webClipper` | Default clip folder. Usually sent by the browser extension instead. |
| `MARKVAULT_ASSETS_FOLDER` | No | `_webClipper/assets` | Default assets folder. Usually sent by the browser extension instead. |
| `MARKVAULT_DEFAULT_TAGS` | No | empty | Server-side default tags. Separate multiple tags with commas. |
| `MARKVAULT_LOCALIZE_IMAGES` | No | `true` | Whether images are downloaded by default. The extension can override it. Use `true` or `false`. |
| `MARKVAULT_IMAGE_LINK_MODE` | No | `wikilink` | Image link style. The default is suitable for Obsidian-style vaults. |
| `MARKVAULT_CORS_ORIGINS` | No | `*` | Allowed CORS origins. Separate multiple origins with commas. |
| `MARKVAULT_MAX_BODY_BYTES` | No | `8388608` | Maximum request body size. Default is 8 MB. |
| `MARKVAULT_FILENAME_DATE_PREFIX` | No | `true` | Whether saved Markdown files get a date prefix. Use `true` or `false`. |

Optional JSON config files are still supported. If you mount one, create it as a
real file before running Compose. If the host path does not exist, Docker may
create `config.json` as a directory.

After deployment, open:

```text
https://clipper.example.com/
```

If the page returns `MarkVault Clipper API connected successfully.`, the server
is reachable.

## Development

```text
npm install
npm run build:extension
```

For local testing, load `extension/` as an unpacked Edge/Chrome extension. For
release, zip the contents of `extension/`.
