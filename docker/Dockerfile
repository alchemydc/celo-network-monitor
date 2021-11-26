FROM node:12-bullseye as base
FROM base as builder

RUN apt-get update && \
    apt-get install -y libudev-dev libusb-1.0-0-dev build-essential python3 make g++ gcc

WORKDIR /opt/monitor

RUN mkdir -p /opt/monitor/
ADD ../package.json ../yarn.lock ../.snyk ../VERSION /opt/monitor/ 
RUN yarn

ADD .. /opt/monitor/
RUN yarn build

RUN rm -rf node_modules
RUN yarn install --production

FROM base

WORKDIR /opt/monitor
COPY --from=builder /opt/monitor/env-template /opt/monitor/
COPY --from=builder /opt/monitor/build /opt/monitor/
COPY --from=builder /opt/monitor/package.json /opt/monitor/package.json
COPY --from=builder /opt/monitor/node_modules /opt/monitor/node_modules
COPY --from=builder /opt/monitor/wrapper.sh /opt/monitor/wrapper.sh

ENTRYPOINT exec /opt/monitor/wrapper.sh
