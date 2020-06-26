FROM node:10 as base
# Build
FROM base as builder

RUN apt-get update && \
    apt-get install -y libudev-dev libusb-1.0-0-dev

WORKDIR /opt/monitor

RUN mkdir -p /opt/monitor/
ADD package.json yarn.lock /opt/monitor/
RUN yarn

ADD . /opt/monitor/
RUN yarn build

RUN rm -rf node_modules
RUN yarn install --production --modules-folder=build/node_modules

# Run
FROM base

ENV ENV_FILE .env-template

WORKDIR /opt/monitor
COPY --from=builder /opt/monitor/.env* /opt/monitor/
COPY --from=builder /opt/monitor/build /opt/monitor
COPY --from=builder /opt/monitor/package.json /opt/monitor/package.json

CMD ["yarn", "start"]