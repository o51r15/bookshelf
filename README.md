<div align="center">

# Bookshelf

**Book collection manager for Usenet and BitTorrent users.**

A revival of [Readarr](https://github.com/Readarr/Readarr) with working metadata search, multi-provider support, and no analytics spyware.

[![GitHub last commit](https://img.shields.io/github/last-commit/o51r15/bookshelf)](https://github.com/o51r15/bookshelf)
[![Docker Image](https://img.shields.io/badge/ghcr.io-bookshelf%3Adev-blue)](https://ghcr.io/o51r15/bookshelf)
[![License: GPL v3](https://img.shields.io/badge/license-GPLv3-green.svg)](LICENSE.md)

</div>

---

> **Active Development** — forked from [pennydreadful/bookshelf](https://github.com/pennydreadful/bookshelf) with significant metadata improvements. Expect frequent updates.

## What It Does

Bookshelf monitors RSS feeds for new books from your favorite authors, grabs them via Usenet or BitTorrent, and organizes your library. It supports ebooks and audiobooks (one format per instance).

Unlike stock Readarr, Bookshelf ships with a multi-provider metadata system so searching for authors and books actually works — no dependency on a single overloaded metadata service.

## Features

- **Multi-Provider Metadata** — search Google Books, Open Library, Hardcover, and rreading-glasses simultaneously with configurable priority and fallback
- **Runtime Provider Config** — enable/disable providers, reorder priority, and set API keys from the UI at Settings > Metadata Sources
- **No Spyware** — servarr analytics removed
- **Hardcover List Import** — import reading lists from [Hardcover](https://hardcover.app)
- **Native MyAnonaMouse** — search MAM without Prowlarr
- **Improved Matching** — fuzzy matching for search candidate generation
- **No Local Metadata Cache** — metadata fetched fresh from providers
- **Self-Hosted Metadata** — optional support for self-hosted rreading-glasses instances

## Quick Start

### Docker (recommended)

```bash
docker run -d \
  --name bookshelf \
  --restart unless-stopped \
  -p 8787:8787 \
  -v ~/.config/bookshelf:/config \
  -e TZ=America/New_York \
  ghcr.io/o51r15/bookshelf:dev
```

Dashboard: **http://localhost:8787**

### Docker Compose

```yaml
services:
  bookshelf:
    image: ghcr.io/o51r15/bookshelf:dev
    container_name: bookshelf
    restart: unless-stopped
    ports:
      - 8787:8787
    volumes:
      - ~/.config/bookshelf:/config
      - /path/to/books:/books
      - /path/to/downloads:/downloads
    environment:
      - TZ=America/New_York
```

## Metadata Providers

Providers are configured at **Settings > Metadata Sources** in the UI. They're tried in priority order with automatic fallback.

| Provider | Auth Required | Notes |
|----------|:------------:|-------|
| Google Books | No | Good coverage, free API, enabled by default |
| Open Library | No | Open data, good for older/classic titles, enabled by default |
| Hardcover | Yes (API token) | High quality metadata, requires free account at [hardcover.app](https://hardcover.app) |
| rreading-glasses | No | Legacy Readarr metadata proxy, optional |

## Tags

| Tag | Description |
|-----|-------------|
| `dev` | Latest development build from the `develop` branch |
| `dev-vX.Y.Z.N` | Pinned development build |
| `latest` | Stable release from the `master` branch |
| `vX.Y.Z.N` | Pinned stable release |

## Roadmap

- [ ] Monitor series
- [ ] Support ebook and audio files in the same root
- [ ] Additional metadata providers

## Support

If you have a problem, please [file an issue](https://github.com/o51r15/bookshelf/issues) or [start a discussion](https://github.com/o51r15/bookshelf/discussions).

## License

Derivative work of [Readarr](https://github.com/Readarr/Readarr) and [Prowlarr](https://github.com/Prowlarr/Prowlarr), both licensed [GPLv3](http://www.gnu.org/licenses/gpl.html). This project is therefore also licensed under GPLv3.

Copyright 2025-2026
