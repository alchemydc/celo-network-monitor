Celo Network Monitor
====================

![pipeline status](https://gitlab.com/polychainlabs/celo-network-monitor/badges/master/pipeline.svg)

Monitor the health of a Celo validator deployment with alerts like:

![Example Alert](example.png)

## Quick Start

1. Edit [template-addresses.mainnet.yaml](template-addresses.mainnet.yaml) to include addresses for your *your* validator group (and any other accounts you wish to monitor)
2. Edit [template.env](template.env) to include *your* Discord webhook
3. `cd docker && docker-compose up`
4. Profit


## Development

First, set the addresses you'd like to monitor in `addresses.<network>.yaml` and set your node and alerting envars in `env-<network>`. 

Then, develop this project locally with:

```shell
# Setup
yarn
# Test
yarn test
# Run locally
ENV_FILE=env-network yarn dev
```

## Monitors

Monitors can be enabled or disabled by commenting out desired monitors in `src/monitor/monitor.ts`. Default monitors include:

* **Attestation Service** - Monitor a validator's Attestation service (disabled by default)
* **Balance** - Monitor the CELO and cUSD balances of all addresses specified in the addresses yaml file
* **Electability Threshold** - Monitor the threshold of votes needed to get elected
* **Governance** - Monitor the network for governance activity
* **Key Rotation** - When validator keys are rotated, ensure that they are fully rotated
* **Network Participation** - Monitor overall network participation numbers
* **Node** - Monitor Celo node & network health
* **Pending Votes** - Monitor our addresses for pending votes. Remind us to activate them
* **Tobin Tax** - Remind us if/when the Tobin Tax is activated. Never send transactions when it is
* **Validator** - Monitor the health of our validators

## Deployment

The monitor can be containerized and readied for deploy like so. The container will listen on `$PORT` (default: 8080) and run anytime a request hits it. It's intended for deployment in a container management system and the Docker image has a wrapper script that will contact it every CHECK_INTERVAL (default 60s) to initiate a new run of the monitor.

```shell
docker build -t celo-network-monitor-$(cat VERSION) .
docker run monitor
```