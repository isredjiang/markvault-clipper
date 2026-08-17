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

Copy `server/config.example.json` to `server/config.json`, then change at least:

```json
{
  "host": "0.0.0.0",
  "port": 3217,
  "token": "use-a-long-random-token",
  "vaultsRoot": "/vaults"
}
```

Create the config file before running Compose. If the host path does not exist,
Docker may create `config.json` as a directory, which older versions reported as
`EISDIR`.

```text
mkdir -p server
cp server/config.example.json server/config.json
```

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
      - CLIPPER_CONFIG=/app/server/config.json
    volumes:
      - ./server/config.json:/app/server/config.json:ro
      - /path/to/obsidian-vaults:/vaults
    ports:
      - "3217:3217"
    restart: unless-stopped
```

`3217:3217` exposes the server on all host network interfaces. For public
deployments, use HTTPS, firewall rules, or your preferred access control.

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
