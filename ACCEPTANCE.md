# Acceptance Checklist

## Server

- `server/config.json` exists.
- `token` is changed from `change-me`.
- `vaultsRoot` points to the mounted parent folder of your vaults, usually
  `/vaults`.
- The vault folder named in the browser extension exists under `vaultsRoot`.
- The service is reachable through HTTPS.

Expected:

```bash
curl https://clipper.example.com/api/health
```

returns:

```json
{ "ok": true, "name": "MarkVault Clipper" }
```

Expected:

```bash
curl -H "Authorization: Bearer TOKEN" https://clipper.example.com/api/config
```

returns default clip and assets folders.

## Browser Extension

- `markvault-clipper-browser-extension.zip` is extracted.
- Edge/Chrome developer mode is enabled.
- The extracted `extension/` folder is loaded as an unpacked extension.
- The extension page shows the MarkVault Clipper icon.
- Popup bottom has:

```text
URL: https://clipper.example.com
令牌: TOKEN
语言: 简体中文
```

- Popup can save more than one template.
- Popup can delete a template.
- Popup has no add-template button.
- Saving a new template name creates a template.
- Deleting the last template resets to the initial default template.
- Each template has:

```text
模板名称
库名称: existing vault folder name, for example MyVault
剪藏路径: _webClipper
资源路径: _webClipper/assets
标签: optional comma-separated tags
仅剪藏选中文本: on/off
下载资源: on/off
```

- Switching the dropdown changes the vault, folders, tags, and toggles used by
  clipping.
- If `库名称` does not exist, clipping returns an error.
- If `剪藏路径` does not exist, the server creates it.
- If `资源路径` does not exist and `下载资源` is on, the server creates it.
- `自动剪藏` creates a new Markdown note in the configured folder.
- Right-click `剪藏选中文本到 MarkVault` creates a selection note.
- Empty tags produce `tags: []`.
- `下载 Markdown` downloads a local `.md` file without requiring server access.
