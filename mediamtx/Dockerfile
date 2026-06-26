FROM bluenviron/mediamtx:latest
COPY mediamtx.yml /baseline/mediamtx.yml
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
