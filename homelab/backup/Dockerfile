FROM alpine:3.20
RUN apk add --no-cache curl jq tzdata
COPY backup.sh /usr/local/bin/backup.sh
COPY crontab /etc/crontabs/root
RUN chmod +x /usr/local/bin/backup.sh
# Busybox cron, in the foreground so Docker sees it.
CMD ["crond", "-f", "-l", "8"]
