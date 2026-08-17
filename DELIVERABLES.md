# Deliverables

The final user-facing shape is two pieces.

## 1. Docker/Server API

Folder:

```text
server/
```

What it does:

- Receives clip requests from the browser extension.
- Requires the vault name to already exist under `vaultsRoot`.
- Saves browser-generated Markdown.
- Writes notes into the selected vault.
- Creates the clip folder automatically if missing.
- Downloads page resources into the assets folder if enabled.
- Creates the assets folder automatically if missing.

## 2. Browser Extension

Folder:

```text
extension/
```

What it does:

- Clips the current page.
- Clips selected text when enabled.
- Converts page or selected content to Markdown in the browser.
- Uses Mozilla Readability plus Turndown/GFM, the same core approach as
  MarkDownload.
- Sends clips to the server API.
- Saves multiple clipping templates in browser settings.
- Lets the user save and delete templates directly in the popup.
- Lets the popup switch templates from a dropdown.
- Keeps URL, token, and language in the popup footer.
- Can preview, copy, and download the current clip as local Markdown.
- Uses the browser's default download location for local Markdown export.
- Applies the language selector to labels and status messages.
- Ships with extension icons referenced by `manifest.json`.

## Output Packages

The build produces:

```text
outputs/markvault-clipper-browser-extension.zip
outputs/markvault-clipper-server.zip
outputs/markvault-clipper-full-source.zip
```
