# Privacy Policy – KungRC Karaoke Queue

This extension does **not** collect, sell, or send any personal data to the developer or to third parties.

## What data is used

The extension uses:

- Your karaoke queue (list of YouTube URLs)
- Playlists and settings (e.g., default search mode, allow duplicates)
- Learned channel statistics and favorite channels (for biasing search results)
- Minimal metadata cache per video (title, thumbnail URL, duration, video ID)

All of this is stored in `chrome.storage.local` on your device.

## What data is sent

The extension:

- **Does not** send any data to external servers.
- **Does not** use analytics, tracking pixels, or ads.
- Only performs HTTP requests to YouTube to:
  - Open search results pages (when you ask it to)
  - Fetch search result HTML for parsing titles/thumbnails in the popup.

## Permissions

- `storage`: store queue, settings, playlists, bias, metadata in local browser storage.
- `tabs` / `activeTab`: detect current YouTube tab, read its URL, and navigate to the next video.
- `scripting`: used by the content script to listen for video-end events for autoplay.
- `host_permissions` for `youtube.com` and `i.ytimg.com`: required to open and parse YouTube pages and load thumbnails.

## Data lifetime

- All data is stored locally until you:
  - Clear the extension using the "RESET ALL DATA" button in Options, or
  - Remove the extension, or
  - Manually clear extension storage via browser tools.

There is no server-side copy of your data.

If you publish this extension to the Chrome Web Store, please ensure that the privacy information you provide in the listing matches this behavior.
