# KungRC Karaoke Queue

Local-only Chrome Extension for managing YouTube karaoke queues.

- Search with smart `karaoke/lyrics` builder (Thai/EN, key hints, no-vocal mode)
- Popup search results with title + thumbnail + duration
- Queue with **VIP Insert** and **VIP Insert + Play now**
- Autoplay next video when current ends
- Channel bias:
  - Learned channels (by usage)
  - Favorites (⭐)
  - Option: ONLY karaoke channels
- Save/load playlists
- JSON export/import (queue + settings + bias)
- Options page:
  - Settings
  - Kill switch (pause autoplay for 30/60 mins)
  - Bias manager
  - About / Version / Debug info

> Everything stays on your device. No data is sent to any server.

## Install locally (for yourself)

1. Download or clone this folder.
2. Open Chrome → `chrome://extensions`
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked**.
5. Select the folder `KungRC_Karaoke_Queue`.
6. Pin the extension if you want quick access.

Now open YouTube, open the popup, and start searching & queuing.

## Basic usage

- Type song/artist name (no need to type "karaoke" or "lyrics")
- Choose search mode: Karaoke / Lyrics
- Click **Search (in popup)** to list videos
- In search results:
  - **Add**: append to queue
  - **VIP**: insert at top
  - **VIP+Play**: insert at top and play immediately
  - **⭐**: mark channel as favorite (affects bias sorting)

- In the Queue:
  - Drag ∷ handle to reorder
  - ▶ Play now
  - ✕ Remove
  - `Add Current` / `VIP Insert` / `VIP Insert + Play` use the current YouTube tab as a queue item.

- In Options:
  - Change default search mode, Thai key default, allow duplicates, etc.
  - Use Kill switch to pause autoplay temporarily.
  - Export/import bias + settings for backup.

This project is designed as a local tool for **KungRC** style karaoke nights: classic UI, predictable behavior, and no cloud.
