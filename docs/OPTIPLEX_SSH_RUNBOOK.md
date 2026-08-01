# Optiplex SSH Runbook

Reusable directions for connecting to the home server Optiplex and operating its Docker services from any agent session on this Windows machine.

## TL;DR

- Do NOT use OpenSSH `ssh.exe`. Use PuTTY plink / pscp.
- Host: `192.168.1.192` (Optiplex, Linux) · User: `o51r15` · Key: `C:\Users\o51r15\.ssh\id_ed25519.ppk`
- Run everything through Desktop Commander `start_process` with `shell: cmd.exe`.
- Use the short path `C:\PROGRA~1\PuTTY` (the space in "Program Files" breaks cmd quoting).

## Why not OpenSSH

The Windows OpenSSH `ssh.exe` exits 255 with zero output in the agent exec context. Every capture method fails the same way. Do not retry it. plink works because the PuTTY host key is cached and the .ppk key is present.

## Run a remote command

```
C:\PROGRA~1\PuTTY\plink.exe -batch -i C:\Users\o51r15\.ssh\id_ed25519.ppk o51r15@192.168.1.192 "<remote bash command>"
```

## Capture output reliably

```
C:\PROGRA~1\PuTTY\plink.exe -batch -i C:\Users\o51r15\.ssh\id_ed25519.ppk o51r15@192.168.1.192 "<cmd>" > C:\Users\o51r15\out.txt 2>&1 & ping -n 8 127.0.0.1 >nul & type C:\Users\o51r15\out.txt
```

`ping -n N` gives ~N-1 seconds of delay. Empty file but command ran = still running; raise the delay.

## Copy files

- **Download:** `C:\PROGRA~1\PuTTY\pscp.exe -batch -i C:\Users\o51r15\.ssh\id_ed25519.ppk o51r15@192.168.1.192:/remote/path C:\local\path`
- **Upload:** `C:\PROGRA~1\PuTTY\pscp.exe -batch -i C:\Users\o51r15\.ssh\id_ed25519.ppk C:\local\path o51r15@192.168.1.192:/remote/path`

## Quoting rules

- Whole plink remote command in DOUBLE quotes for cmd; use SINGLE quotes for anything the remote bash/psql/jq needs. Nested double quotes break.
- Do NOT use inline `python3 -c "..."` (quotes mangle through cmd->plink->bash). Use `jq -r '.[] | [.a,.b] | @tsv'` or write a script file and run it.
- Edit remote files by pscp down -> edit -> validate -> pscp up. Back up first.

## Server layout (Optiplex, 192.168.1.192)

- Docker host, managed via Portainer.
- Containers: bitmagnet (app), bitmagnet-dht (DHT sidecar), bitmagnet-postgres (postgres:16-alpine).
- bitmagnet config: `~/docker/bitmagnet/config/config.yml` (= `/home/o51r15/docker/bitmagnet/config/`). Under home, NOT /docker.
- Portainer stacks: `/data/compose/<id>/docker-compose.yml` (bitmagnet = `/data/compose/35/`).
- Prowlarr: `http://192.168.1.125:9696/prowlarr` (separate host). API key in config.yml.
- Postgres: db "bitmagnet", user "postgres", container bitmagnet-postgres.

## Bookshelf test deployment

- Container: `bookshelf` (image: `ghcr.io/pennydreadful/bookshelf:hardcover`)
- URL: `http://192.168.1.192:8787`
- Compose: `/home/o51r15/docker/bookshelf/docker-compose.yml`
- Config: `/home/o51r15/docker/bookshelf/config`
- Volumes: `/mnt/otherpool/BookTest/ebook` → `/books`, `/mnt/otherpool/BookTest/audiobook` → `/audiobooks`

## Test library

- Test data: `/mnt/otherpool/BookTest`
  - `/mnt/otherpool/BookTest/audiobook` — Larry Niven, Emily Tesh, Peter Heller
  - `/mnt/otherpool/BookTest/ebook` — Eoin Colfer, J.D. Robb, Sylvia Day
- Mount this into the Bookshelf container as the root folder when deploying for testing.

## Common operations

```bash
# List containers
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}'
```
