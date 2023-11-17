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
		const record = await governance.getProposalRecord(id);

		const url = metadata.descriptionURL;

		if (
			//stage.includes("queued") ||
			//stage.includes("approval") ||
			stage.includes("referendum")
		) {
			// Queued -> Approval -> Referendum
			console.debug(`Proposal ${id} is in referendum stage`);
			const now = new Date().getTime();
			//const referendum = new Date(now + (milestones.Referendum?.toNumber() || 0) * 1000);	// suspect the bug is here.  why add referendum to now?
			const referendum = new Date( milestones.Referendum.toNumber() * 1000);
			
			// debugging the broken dates w/ these console.logs
			console.debug(`time now : ${now}`);
			console.debug(`proposal referendum time : ${referendum}`);
			// print proposal referendum time in local time zone
			console.debug(`proposal referendum time (local TZ): ${getLocalTimeString(referendum, "MMM Do YYYY, HH:mm zz")}`);
			//console.debug(`proposal referendum time (local TZ): ${getLocalTimeString(referendum, "dddd mmmm dS, yyyy, hh:mm zz")}`);

			const execution = new Date( milestones.Execution.toNumber()  * 1000);
			// debugging the broken dates w/ these console.logs
			console.debug(`proposal execution time : ${execution}`);
			// print proposal execution time in local time zone
			console.debug(`proposal execution time (local TZ): ${getLocalTimeString(execution, "MMM Do YYYY, HH:mm zz")}`);

			// pull needed info out of the proposal record
			console.debug(`proposal ${id} record : ${record}`);

			const msg =
				`Proposal \`${id}\` is in stage: \`${stage}\`. ` +
				`${this.getReferendumString(referendum)} ` +
				`${this.getExecutionString(execution)} ` +
				`${url}`;

			console.debug(`Discord alert key: ${stage}-${this.isInPast(referendum)}-${this.isInPast(execution)}-proposal-${id}`)
			await this.alert.discord(
				msg,
				24 * 60 * 60,
				`${stage}-${this.isInPast(referendum)}-${this.isInPast(execution)}-proposal-${id}`
			);

			if ( stage.includes("referendum") ) {
				// check progress of proposal towards passing
				const support = await governance.getSupport(id);
				let votesFor = this.cleanupVotes(support.total.toNumber());
				let votesRequired = this.cleanupVotes(support.required.toNumber());
				let percentageOfRequired = Math.round((votesFor / votesRequired) * 100);
				const msg2 = `Proposal ${id} has ${percentageOfRequired}% of the required votes to pass (${votesFor} of ${votesRequired}).`;
				console.debug(`Discord alert key: ${stage}-${this.isInPast(referendum)}-${this.isInPast(execution)}-proposal-${id}-votes`)
				await this.alert.discord(
					msg2,
					24 * 60 * 60,
					`${stage}-${this.isInPast(referendum)}-${this.isInPast(execution)}-proposal-${id}-votes`
				);
			}
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
				"MMM Do YYYY, HH:mm zz"
			)}\``;
		}
		return "Voting has begun. ";
	}

	getExecutionString(execution: Date): string {
		if (this.isInPast(execution)) {
			return `Voting will end on \`${getLocalTimeString(
				execution,
				"MMM Do YYYY, HH:mm zz"
			)}\``;
		}
		return "Execution milestone passed.";
	}

	cleanupVotes(votes: number): number {
		if(votes != 0) {
			if( isNaN(votes)) {
				votes = 0;
			}
			return Math.trunc(votes / 1e18);
	} else {
		return votes;
	  }
	} 
}
