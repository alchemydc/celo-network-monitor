import MonitorBase from "./monitorBase";

/** Monitor the threshold of votes needed to get elected */
export default class MonitorElectabilityThreshold extends MonitorBase {
	protected async run() {
		const election = await this.kit.contracts.getElection();
		const electabilityThreshold = (
			await election.electabilityThreshold()
		).toNumber();
		this.metrics.log("ElectabilityThreshold", electabilityThreshold);
		const fullGroupVoteThreshold = electabilityThreshold * 5 + 1;
		this.metrics.log("FullGroupVoteThreshold", fullGroupVoteThreshold);

		// Now find the margin on our groups
		for (const group of this.addresses.groups()) {
			const totalGroupVotes = (await election.getTotalVotesForGroup(group))
				.dividedBy(1e18)
				.toNumber();
			if (totalGroupVotes > 0) {
				this.metrics.log(
					"GroupVotes",
					totalGroupVotes,
					this.addresses.alias(group)
				);
				// Votes for last (5th) validator
				const votesForLastValidator = totalGroupVotes / 5;
				this.metrics.log(
					"VotesForLastValidator",
					votesForLastValidator,
					this.addresses.alias(group)
				);
				// Excess votes
				if (votesForLastValidator > electabilityThreshold) {
					const excessVotesFor5thValidator = Math.min(
						(votesForLastValidator - electabilityThreshold) * 5,
						totalGroupVotes
					);
					this.metrics.log(
						"ExcessGroupVotes",
						excessVotesFor5thValidator,
						this.addresses.alias(group)
					);
				}
			}
		}
	}
}
