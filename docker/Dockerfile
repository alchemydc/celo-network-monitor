FROM bitnami/node:14 AS builder

RUN install_packages libudev-dev libusb-1.0-0-dev build-essential python3 make g++ gcc

WORKDIR /opt/monitor

RUN mkdir -p /opt/monitor/
ADD package.json yarn.lock .snyk VERSION /opt/monitor/ 
RUN yarn

ADD . /opt/monitor/
RUN yarn build && rm -rf node_modules && yarn install --production

FROM bitnami/node:14-prod
ENV NODE_ENV="production"

WORKDIR /opt/monitor
COPY --from=builder /opt/monitor/build /opt/monitor/
COPY --from=builder /opt/monitor/node_modules /opt/monitor/node_modules
COPY --from=builder /opt/monitor/package.json /opt/monitor/wrapper.sh /opt/monitor/

ENTRYPOINT exec /opt/monitor/wrapper.sh
