# MarkVault Clipper Install Guide

## Server Config

Copy `server/config.example.json` to `server/config.json`.

Recommended multi-vault config:

```json
{
  "host": "0.0.0.0",
  "port": 3217,
  "token": "use-a-long-random-token",
  "vaultsRoot": "/vaults",
  "defaultFolder": "_webClipper",
  "assetsFolder": "_webClipper/assets",
  "defaultTags": [],
  "localizeImages": true
}
```

`vaultsRoot` is the parent directory containing your Obsidian vault folders.
The browser extension sends only a vault folder name, for example `MyVault`.

If `/vaults/MyVault` does not exist, the server returns an error. Clip and
assets folders are created automatically.

## Docker Compose

Mount the parent folder of your vaults:

```yaml
services:
  markvault-clipper:
    image: ghcr.io/isredjiang/markvault-clipper:latest
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

`3217:3217` exposes the service on all host network interfaces. For public
servers, keep it behind HTTPS, firewall rules, or access control.

Put it behind HTTPS with your existing reverse proxy.

## Browser Extension

At the bottom of the popup, fill the global connection fields:

```text
URL: https://clipper.example.com
Token: token from server/config.json
Language: Simplified Chinese
```

Above the connection fields, save one or more clipping templates:

```text
Template name: Tech Notes
Vault name: MyVault
Clip folder: _webClipper
Assets folder: _webClipper/assets
Tags: AI, docs
Clip selected text only: on/off
Download resources: on/off
```

The clip folder and assets folder can be left empty. The popup shows
`_webClipper` and `_webClipper/assets` as grey placeholders, and those defaults
are used when clipping. `Download resources` is off by default.

Leave `Tags` empty if you want `tags: []` in Markdown front matter.

Use `Preview Markdown`, then `Copy Markdown`, if you want to inspect and copy
the generated Markdown before saving.

Use `Download Markdown` if you only want a local `.md` file. This export does
not require the server.

## API

```text
GET  /api/health
GET  /api/config
POST /api/preview
POST /api/clip
POST /api/reload
```

All endpoints except `/api/health` require:

```text
Authorization: Bearer <token>
```
