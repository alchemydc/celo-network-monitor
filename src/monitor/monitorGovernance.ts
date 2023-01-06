/* ************************************************************************************** 
see https://docs.celo.org/protocol/governance for information about the governance process
see https://github.com/celo-org/celo-monorepo/blob/master/packages/protocol/contracts/governance/Governance.sol for the contract code
see https://github.com/celo-org/celocli/blob/main/src/commands/governance/show.ts

Phase 1: "queued"
Period: 24 hours
Description: Proposals may be submitted by anybody, and have 24 hours to be upvoted. Top 3 move on to the approval phase.
Without upvotes, proposals are automatically dequeued after 4 weeks (expired)

Phase 2: "approval"
Period: 24 hours
Description: Upvoted (>=1) proposals must then be manually approved by the approvers, which is a centralized group of 10 people.
If approved, the proposal moves on to the referendum phase.

Phase 3: "referendum"
Period: 5 days
Description: Approved proposals are then voted on by the community (specifically, holders of locked CELO).
If the vote passes, the proposal moves on to the execution phase.
**************************************************************************************** */


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
				now + (milestones.Referendum?.toNumber() || 0) * 1000	// suspect the bug is here.  why add referendum to now?
			);
			// debugging the broken dates w/ these console.logs
			console.log(referendum);
			const execution = new Date(
				now + (milestones.Execution?.toNumber() || 0) * 1000   // suspect the bug is here.  why add referendum to now?
			);
			// debugging the broken dates w/ these console.logs
			console.log(execution);

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
