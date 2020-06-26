import MonitorBase from "./monitorBase";
import { slackAddressDetails } from "./alert";
import BigNumber from "bignumber.js";
import { weiToIntegerFloorCommas } from "./formatting";

const pendingVoteCache = new Map<string, BigNumber>()

/** Monitor our addresses for pending votes. Remind us to activate them. */
export default class MonitorPendingVotes extends MonitorBase {
    protected async run() {
        const election = await this.kit.contracts.getElection();
        for (const address of this.addresses.addresses().keys()) {
            const voter = await election.getVoter(address);
            for(const votes of voter.votes) {
                const cacheKey = `${address}-${votes.group}`

                if (votes.pending.isGreaterThanOrEqualTo(1e18)) {
                    // There are pending votes
                    const pendingVoteString = weiToIntegerFloorCommas(votes.pending)
                    await this.alert.slack(
                        `\`${this.addresses.alias(address)}\` has \`${pendingVoteString}\` pending votes for \`${this.addresses.alias(votes.group)}\` ${slackAddressDetails(address)}`,
                        18*60*60,
                    );
                }

                if (votes.pending.isEqualTo(0) && pendingVoteCache.get(cacheKey)?.isGreaterThan(0)) {
                    // Votes have been activated
                    const activatedVoteString = weiToIntegerFloorCommas(pendingVoteCache.get(cacheKey))
                    await this.alert.slack(
                        `\`${activatedVoteString}\` votes activated by \`${this.addresses.alias(address)}\` for \`${this.addresses.alias(votes.group)}\` ${slackAddressDetails(address)}`,
                        24*60*60,
                    );
                }
                pendingVoteCache.set(cacheKey, votes.pending)
            }
        }
    }
}