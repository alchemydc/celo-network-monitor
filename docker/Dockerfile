#FROM bitnami/node:18 AS builder
FROM node:18-slim AS builder

#RUN install_packages libudev-dev libusb-1.0-0-dev build-essential python3 make g++ gcc
RUN apt update && apt install -y libudev-dev libusb-1.0-0-dev build-essential python3 make g++ gcc git node-gyp
WORKDIR /opt/monitor

RUN mkdir -p /opt/monitor/
ADD package.json yarn.lock .snyk VERSION /opt/monitor/ 
RUN yarn

ADD . /opt/monitor/
#RUN yarn build && rm -rf node_modules && yarn install --production
RUN yarn build

#FROM bitnami/node:18-prod
FROM node:18-alpine
ENV NODE_ENV="production"

RUN apk --no-cache add curl

WORKDIR /opt/monitor
COPY --from=builder /opt/monitor/build /opt/monitor/
COPY --from=builder /opt/monitor/node_modules /opt/monitor/node_modules
COPY --from=builder /opt/monitor/package.json /opt/monitor/wrapper.sh /opt/monitor/

ENTRYPOINT exec /opt/monitor/wrapper.sh
