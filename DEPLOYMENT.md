# Bookshelf Deployment Reference

## Test Server: Optiplex
- **Host:** 192.168.1.192
- **SSH:** `plink -batch o51r15@192.168.1.192`
- **Web UI:** http://192.168.1.192:8787
- **User:** o51r15

## Docker Run Command

```bash
docker run -d \
  --name bookshelf \
  --restart unless-stopped \
  -p 8787:8787 \
  -v /home/o51r15/docker/bookshelf/config:/config \
  -v /mnt/otherpool/BookTest/ebook:/books \
  -v /mnt/otherpool/BookTest/audiobook:/audiobooks \
  -e PUID=1000 \
  -e PGID=1000 \
  ghcr.io/o51r15/bookshelf:dev
```

## Volume Mounts

| Host Path | Container Path | Purpose |
|-----------|---------------|---------|
| `/home/o51r15/docker/bookshelf/config` | `/config` | App config, databases, logs |
| `/mnt/otherpool/BookTest/ebook` | `/books` | Ebook library (on NAS share, 216T pool) |
| `/mnt/otherpool/BookTest/audiobook` | `/audiobooks` | Audiobook library (on NAS share) |

## Paths on Optiplex

- **Docker data directories:** `/home/o51r15/docker/` (each container has its own subdirectory)
- **NAS mount:** `/mnt/otherpool` (SMB share from 192.168.1.200, mounted at boot)
- **Ebook library:** `/mnt/otherpool/BookTest/ebook`
- **Audiobook library:** `/mnt/otherpool/BookTest/audiobook`
- **Config directory:** `/home/o51r15/docker/bookshelf/config/`
  - `config.xml` — app settings
  - `readarr.db` — main database
  - `logs.db` — log database
  - `MediaCover/` — cached cover images

## Docker Compose

Located at `/home/o51r15/docker/bookshelf/docker-compose.yml`

## Redeploy Steps

```bash
# Pull latest, stop, remove, recreate
plink -batch o51r15@192.168.1.192 "docker pull ghcr.io/o51r15/bookshelf:dev && docker stop bookshelf && docker rm bookshelf && docker run -d --name bookshelf --restart unless-stopped -p 8787:8787 -v /home/o51r15/docker/bookshelf/config:/config -v /mnt/otherpool/BookTest/ebook:/books -v /mnt/otherpool/BookTest/audiobook:/audiobooks -e PUID=1000 -e PGID=1000 ghcr.io/o51r15/bookshelf:dev"
```

## Verify

```bash
# Check container status
plink -batch o51r15@192.168.1.192 "docker ps --filter name=bookshelf --format '{{.Names}} {{.Status}}'"

# Check logs
plink -batch o51r15@192.168.1.192 "docker logs bookshelf --tail 30 2>&1"
```

## CI/CD

- **Repo:** https://github.com/o51r15/bookshelf
- **Branch:** develop
- **CI:** GitHub Actions (`.github/workflows/ci.yml`)
- **Registry:** ghcr.io/o51r15/bookshelf:dev
- **Build time:** ~5-17 minutes (multi-arch: linux/amd64, linux/arm64)

## Other Related Containers on Optiplex

- **abs-tract:** arranhs/abs-tract:latest at 192.168.1.171:5555 (Goodreads/Kindle metadata, ABS spec)
- **audiobookshelf:** running alongside bookshelf
