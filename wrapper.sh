#!/bin/sh
yarn start &
while true; do
curl -s "http://127.0.0.1:$PORT" && sleep $CHECK_INTERVAL;
done;
