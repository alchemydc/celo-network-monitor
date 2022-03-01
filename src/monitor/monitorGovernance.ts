import MonitorBase from "./monitorBase";
import { GovernanceWrapper } from "@celo/contractkit/lib/wrappers/Governance";
import BigNumber from "bignumber.js";
import { getLocalTimeString } from "./formatting";

/** Monitor the network for governance activity */
export default class MonitorGovernance extends MonitorBase {
	protected async run() {
		const governance = await this.kit.contracts.getGovernance();
		const queue = await governance.getQueue();
		for (const proposal of queue) {
			this.monitorProposal(governance, new BigNumber(proposal.proposalID));
		}
		const dequeue = await governance.getDequeue();
		for (const proposalID of dequeue) {
			this.monitorProposal(governance, new BigNumber(proposalID));
		}
	}

	async monitorProposal(governance: GovernanceWrapper, id: BigNumber) {
		const metadata = await governance.getProposalMetadata(id);
		const milestones = await governance.proposalSchedule(id);
		const stage = (await governance.getProposalStage(id)).toLowerCase();

		const url = metadata.descriptionURL;

		if (
			stage.includes("queued") ||
			stage.includes("approval") ||
			stage.includes("referendum")
		) {
			// Queued -> Approval -> Referendum
			const now = new Date().getTime();
			const referendum = new Date(
				now + (milestones.Referendum?.toNumber() || 0) * 1000
			);
			const execution = new Date(
				now + (milestones.Execution?.toNumber() || 0) * 1000
			);

			const msg =
				`Proposal \`${id}\` is in stage: \`${stage}\`. ` +
				`${this.getReferendumString(referendum)} ` +
				`${this.getExecutionString(execution)} ` +
				`${url}`;

			await this.alert.discord(
				msg,
				24 * 60 * 60,
				`${stage}-${this.isInPast(referendum)}-${this.isInPast(
					execution
				)}-proposal-${id}`
			);
		}
	}

	isInPast(date: Date): boolean {
		const now = new Date();
		return date.getTime() > now.getTime();
	}

	getReferendumString(referendum: Date): string {
		if (this.isInPast(referendum)) {
			return `Upvoting ends and voting begins on \`${getLocalTimeString(
				referendum,
				"dddd M/D, h:mma zz"
			)}\``;
		}
		return "Voting has begun.";
	}

	getExecutionString(execution: Date): string {
		if (this.isInPast(execution)) {
			return `Execution can occur after \`${getLocalTimeString(
				execution,
				"dddd M/D, h:mma zz"
			)}\``;
		}
		return "Execution milestone passed.";
	}
}
