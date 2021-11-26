#!/bin/bash
/usr/local/bin/yarn start &
while true; do
/usr/bin/curl -s "http://127.0.0.1:$PORT" && /bin/sleep $CHECK_INTERVAL;
done;
