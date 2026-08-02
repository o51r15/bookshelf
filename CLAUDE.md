# Bookshelf (Readarr Fork) — Project Context

## Project
- **Repo:** github.com/o51r15/bookshelf (fork of pennydreadful/bookshelf, itself a fork of Readarr)
- **Branch:** develop
- **Stack:** .NET 6 backend (C#), React frontend, DryIoc DI, SQLite databases
- **Image:** ghcr.io/o51r15/bookshelf:dev

## Test Environment
- **Optiplex:** 192.168.1.192
- **SSH:** `plink -batch o51r15@192.168.1.192` (PuTTY plink, not regular ssh)
- **Web UI:** http://192.168.1.192:8787
- **Container name:** bookshelf

## Docker Volumes (IMPORTANT — use these exact paths)
- **Config:** `/home/o51r15/docker/bookshelf/config:/config`
- **Ebooks:** `/mnt/otherpool/BookTest/ebook:/books`
- **Audiobooks:** `/mnt/otherpool/BookTest/audiobook:/audiobooks`
- **Docker data pattern:** all containers store data under `/home/o51r15/docker/<container-name>/`
- **NAS:** `/mnt/otherpool` is SMB from 192.168.1.200 (216T pool)

## Full Docker Run
```bash
docker run -d --name bookshelf --restart unless-stopped -p 8787:8787 \
  -v /home/o51r15/docker/bookshelf/config:/config \
  -v /mnt/otherpool/BookTest/ebook:/books \
  -v /mnt/otherpool/BookTest/audiobook:/audiobooks \
  -e PUID=1000 -e PGID=1000 \
  ghcr.io/o51r15/bookshelf:dev
```

## Key Architecture Decisions
- **DryIoc auto-registration:** RegisterMany scans ALL types including private/internal. Classes implementing auto-discovered interfaces MUST have a DI-constructable public constructor or they'll crash the container.
- **CustomMetadataProvider pattern:** Uses DI-friendly constructor (IHttpClient, Logger) creating a disabled placeholder + static Create() factory for real instances. Key `__custom_placeholder__` is filtered out of provider lists.
- **Metadata pipeline:** IMetadataProvider interface → multiple providers (Google Books, Open Library, Hardcover, rreading-glasses, Audible, Custom) → MetadataProviderService orchestrates fallback chain → settings UI at /settings/metadata

## Related Services
- **abs-tract:** 192.168.1.171:5555 (arranhs/abs-tract:latest) — Goodreads/Kindle metadata following ABS custom provider spec
