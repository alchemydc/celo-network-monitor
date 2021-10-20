import MonitorBase from "./monitorBase";
import { weiToIntegerFloor, weiToIntegerFloorCommas } from "./formatting";
import BigNumber from "bignumber.js";
import { discordCeloInfo } from "./alert";

const voteCache = new Map<string, BigNumber>();

/** Monitor our used and free capacity to validate on behalf of votes */
export default class MonitorVoteCapacity extends MonitorBase {
	protected async run() {
		const election = await this.kit.contracts.getElection();

		for (const group of this.addresses.groups()) {
			const groupVotes = await election.getValidatorGroupVotes(group);
			if (groupVotes.eligible) {
				const remainingCapacity = groupVotes.capacity;
				const votes = groupVotes.votes;
				const totalCapacity = votes.plus(remainingCapacity);
				console.debug(`Group: ${this.addresses.alias(group)}`);
				console.debug(
					`> ${weiToIntegerFloorCommas(votes)}/${weiToIntegerFloorCommas(
						totalCapacity
					)} Votes. Room for ${weiToIntegerFloorCommas(
						remainingCapacity
					)} more votes`
				);
				this.metrics.log(
					"VoteTotalCapacity",
					weiToIntegerFloor(totalCapacity),
					this.addresses.alias(group)
				);
				this.metrics.log(
					"VoteFreeCapacity",
					weiToIntegerFloor(remainingCapacity),
					this.addresses.alias(group)
				);
				this.metrics.log(
					"Votes",
					weiToIntegerFloor(votes),
					this.addresses.alias(group)
				);

				if (voteCache.has(group)) {
					// Alert when the votes for this group have changed
					if (voteCache.get(group) != votes) {
						const cachedVotes = voteCache.get(group) || new BigNumber(0);
						const deltaVotes = votes.minus(cachedVotes).abs();

						// Don't alert on rounding errors
						const minDelta = new BigNumber(1e18);
						if (deltaVotes.isGreaterThan(minDelta)) {
							const deltaString = votes.isGreaterThan(cachedVotes)
								? "increased"
								: "decreased";

							await this.alert.discord(
								`Votes for \`${this.addresses.alias(
									group
								)}\` have ${deltaString} by \`${weiToIntegerFloorCommas(
									deltaVotes
								)}\` to \`${weiToIntegerFloorCommas(
									votes
								)}\` ${discordCeloInfo(group)}`
							);
						}
					}
				}
				voteCache.set(group, votes);
			}
		}
	}
}
