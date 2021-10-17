FROM node:12-buster as base
FROM base as builder

RUN apt-get update && \
    apt-get install -y libudev-dev libusb-1.0-0-dev build-essential python3 make g++ gcc

WORKDIR /opt/monitor

RUN mkdir -p /opt/monitor/
ADD package.json yarn.lock .snyk /opt/monitor/
RUN yarn

ADD . /opt/monitor/
RUN yarn build

RUN rm -rf node_modules
RUN yarn install --production

FROM base

ENV ENV_FILE .env-template

WORKDIR /opt/monitor
COPY --from=builder /opt/monitor/.env* /opt/monitor/
COPY --from=builder /opt/monitor/build /opt/monitor/
COPY --from=builder /opt/monitor/package.json /opt/monitor/package.json
COPY --from=builder /opt/monitor/node_modules /opt/monitor/node_modules

CMD ["yarn", "start"]
