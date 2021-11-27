#!/bin/bash
set -x

VERSION=$(cat ../VERSION)

echo "Deleting old full node data"
sudo rm -rfv $HOME/celo-network-monitor/docker/mainnet/full-node-data/celo
sudo rm -rfv $HOME/celo-network-monitor/docker/mainnet/full-node-data/keystore
sudo rm -rfv $HOME/celo-network-monitor/docker/baklava/full-node-data/baklava

cd ..
docker build -f docker/Dockerfile -t celo-network-monitor:$VERSION . && docker image tag celo-network-monitor:$VERSION celo-network-monitor:latest