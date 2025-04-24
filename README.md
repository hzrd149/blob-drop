# Morning Glory

A paid blossom server that only stores blobs for a day... just like the flower.

## Features

- [x] [BUD-01](https://github.com/hzrd149/blossom/blob/master/buds/01.md) GET `/:sha256` and HEAD endpoints
- [x] [BUD-02](https://github.com/hzrd149/blossom/blob/master/buds/02.md) PUT `/upload` endpoint
- [x] [NUT-23](https://github.com/cashubtc/nuts/pull/239) http cashu payments
- [ ] Range requests
- [x] Simple homepage with lightning support

## Running

### Docker

```bash
docker run -d -p 3000:3000 -v $(pwd)/data:/data ghcr.io/hzrd149/morning-glory:master
```

### Docker compose


```yaml
volumes:
  data: {}

services:
  blossom:
    image: ghcr.io/hzrd149/morning-glory:master
    restart: unless-stopped
		ports:
			- 3000:3000
    environment:
      PORT: '3000'
      CASHU_PAYOUT: 'creqA...' # Required
      STORAGE_DIR: /data/blobs
      DATABASE_PATH: /data/database.sqlite
			# ... extra config from .env.example
    volumes:
      - data:/data
```

## Local development

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

## Configuration

The server can be configured using environment variables, see [.env.example](.env.example) for more details.

## Testing upload

To test file uploads locally, use the `upload.sh` script.

Requires `curl` and `nak wallet` to be installed and is hard coded to pay 1 sat per byte, so maybe use `https://testnut.cashu.space` for testing.

```bash
bash upload.sh /path/to/file
```
