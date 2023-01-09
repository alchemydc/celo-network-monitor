// see https://github.com/celo-org/celo-monorepo/blob/master/packages/protocol/contracts/governance/Election.sol

import MonitorBase from "./monitorBase";

/** Monitor the threshold of votes needed to get elected */
export default class MonitorElectabilityThreshold extends MonitorBase {
	protected async run() {
		const election = await this.kit.contracts.getElection();
		// Groups must receive at least this fraction of the total votes in order to be considered in elections
		const electabilityThreshold = (
			await election.electabilityThreshold()
		).toNumber();
		this.metrics.log("ElectabilityThreshold", electabilityThreshold);
		console.debug("Electabilitythreshold: " + electabilityThreshold)
		const fullGroupVoteThreshold = electabilityThreshold * 2 + 1;
		this.metrics.log("FullGroupVoteThreshold", fullGroupVoteThreshold);
		console.debug("FullGroupVoteThreshold: " + fullGroupVoteThreshold);

		// Now find the margin on our groups
		for (const group of this.addresses.groups()) {
			const totalGroupVotes = (await election.getTotalVotesForGroup(group))
				.dividedBy(1e18)
				.toNumber();
				console.debug("totalGroupVotes: " + totalGroupVotes)
			if (totalGroupVotes > 0) {
				this.metrics.log(
					"GroupVotes",
					totalGroupVotes,
					this.addresses.alias(group)
				);
				// Votes for last (2nd) validator
				const votesForLastValidator = totalGroupVotes / 2;
				console.debug("VotesForLastValidator: " + votesForLastValidator)
				this.metrics.log(
					"VotesForLastValidator",
					votesForLastValidator,
					this.addresses.alias(group)
				);
				// Excess votes
				if (votesForLastValidator > electabilityThreshold) {
					const excessVotesFor2ndValidator = Math.min(
						(votesForLastValidator - electabilityThreshold) * 2,
						totalGroupVotes
					);
					this.metrics.log(
						"ExcessGroupVotes",
						excessVotesFor2ndValidator,
						this.addresses.alias(group)
					);
					console.debug("ExcessGroupVotes: " + excessVotesFor2ndValidator)
				}
			}
		}
	}
}
