import { nodeIsSynced } from "@celo/celocli/lib/utils/helpers";
import MonitorBase from "./monitorBase";
import { blockDetails, blockExplorerUrl } from "./alert";

/** Monitor Celo node & network health */
export default class MonitorNode extends MonitorBase {
	protected async run() {
		// Check to see if the node is still online and caught up
		const isSynced = await nodeIsSynced(this.kit.web3);
		console.debug("node isSynced: " + isSynced)
		const blockNumber = await this.kit.web3.eth.getBlockNumber();
		const block = await this.kit.web3.eth.getBlock(blockNumber);
		const blockAgeSeconds =
			new Date().getTime() / 1000 - Number(block.timestamp);
		const blockAgeMinutes = Math.floor(blockAgeSeconds / 60);
		console.debug(`> Block Age Seconds: ${blockAgeSeconds}`);

		if (!isSynced || blockAgeMinutes > 5) {
			// Discord after 5 minutes
			await this.alert.discordWarn(
				`Monitoring full node is lagged: \`${blockAgeSeconds} seconds\` ${blockDetails(block.number)}`,
				60 * 5,
				`stuck on block ${blockNumber}`
			);

			if (blockAgeMinutes > 10) {
				// Page after 10
				await this.alert.page(
					"Celo: Monitoring Node Network Lag",
					`Lag of ${blockAgeMinutes} minutes. Stuck on block ${blockNumber}`,
					10 * 60,
					`stuck on block ${blockNumber}.  See: ${blockExplorerUrl(block.number)}`
				);
			}
		}
	}
}
