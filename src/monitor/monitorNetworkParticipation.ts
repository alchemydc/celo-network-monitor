import MonitorBase from "./monitorBase";
import { weiToIntegerFloor } from "./formatting";
import BigNumber from "bignumber.js";

/** Monitor overall network participation numbers  */
export default class MonitorNetworkParticipation extends MonitorBase {
	protected async run() {
		const election = await this.kit.contracts.getElection();
		const lockedGold = await this.kit.contracts.getLockedGold();

		// Locked Gold Stats
		const networkLockedGold = await lockedGold.getTotalLockedGold();
		this.metrics.log("NetworkLockedGold", weiToIntegerFloor(networkLockedGold));

		// Total Vote Stats
		let totalNetworkVotes = new BigNumber(0);
		const eligibleValidatorGroups =
			await election.getEligibleValidatorGroupsVotes();
		for (const vote of eligibleValidatorGroups) {
			totalNetworkVotes = totalNetworkVotes.plus(vote.votes);
		}
		this.metrics.log("NetworkTotalVotes", weiToIntegerFloor(totalNetworkVotes));
		this.metrics.log("NetworkGroups", eligibleValidatorGroups.length);
	}
}
