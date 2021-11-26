#!/bin/bash
set -x

VERSION=$(cat ../VERSION)

cd ..
docker build -f docker/Dockerfile -t celo-network-monitor:$VERSION .
