#!/bin/bash
set -x

VERSION=$(cat ../VERSION)

docker build -t celo-network-monitor:$VERSION .
