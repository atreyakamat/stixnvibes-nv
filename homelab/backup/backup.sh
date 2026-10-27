#!/bin/sh
# Pulls a full copy of the shop's data and keeps one gzipped file per day.
# Run by cron at 03:00; run it by hand with:
#   docker compose exec backup backup.sh
set -eu

: "${SHOP_URL:?Set SHOP_URL in .env}"
: "${BACKUP_TOKEN:?Set BACKUP_TOKEN in .env}"
KEEP_DAYS="${KEEP_DAYS:-30}"
DIR=/backups
DAY="$(date +%F)"
TMP="$DIR/.incoming.json"

mkdir -p "$DIR"
log() { echo "[backup $(date '+%F %T')] $*"; }

fail() {
  log "FAILED: $*"
  rm -f "$TMP"
  # Tell Uptime Kuma, so the push monitor goes red straight away.
  if [ -n "${BACKUP_PUSH_URL:-}" ]; then
    curl -fsS -m 20 "$(echo "$BACKUP_PUSH_URL" | sed 's/status=up/status=down/; s/msg=[^&]*/msg=backup-failed/')" >/dev/null || true
  fi
  exit 1
}

log "Downloading from $SHOP_URL"
curl -fsS -m 120 --retry 3 --retry-delay 20 \
  -H "Authorization: Bearer $BACKUP_TOKEN" \
  "$SHOP_URL/api/integrations/backup" -o "$TMP" || fail "download"

# Only keep it if it's a real copy.
jq -e '.version == 1 and (.data.products | type == "array")' "$TMP" >/dev/null || fail "the file isn't a valid backup"

ORDERS="$(jq '.data.orders | length' "$TMP")"
PRODUCTS="$(jq '.data.products | length' "$TMP")"
gzip -c "$TMP" > "$DIR/$DAY.json.gz.part" && mv "$DIR/$DAY.json.gz.part" "$DIR/$DAY.json.gz"

if [ "${BACKUP_IMAGES:-0}" = "1" ]; then
  mkdir -p "$DIR/images"
  jq -r '[.data.products[]?.images[]?, .data.gallery_items[]?.image, .data.blog_posts[]?.cover, .data.colleges[]?.image]
         | map(select(type == "string" and startswith("https://"))) | unique[]' "$TMP" |
  while read -r url; do
    name="$(echo "$url" | sed 's#^https://##; s#[^A-Za-z0-9._-]#_#g' | tail -c 200)"
    [ -f "$DIR/images/$name" ] || curl -fsS -m 60 "$url" -o "$DIR/images/$name" || log "skipped image $url"
  done
fi
rm -f "$TMP"

# Old copies out.
find "$DIR" -maxdepth 1 -name '*.json.gz' -mtime +"$KEEP_DAYS" -delete

log "OK: $PRODUCTS products, $ORDERS orders -> $DIR/$DAY.json.gz"
if [ -n "${BACKUP_PUSH_URL:-}" ]; then
  curl -fsS -m 20 "$BACKUP_PUSH_URL" >/dev/null || log "couldn't reach the push monitor"
fi
