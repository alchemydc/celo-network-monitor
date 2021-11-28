import { ElectionResultsCache } from "@celo/celocli/lib/utils/election";
import { discordAddressDetails, addressExplorerUrl, discordSignerDowntime, discordSignerBlocksProposed } from "./alert";
import BigNumber from "bignumber.js";
import MonitorBase from "./monitorBase";
import { Block } from 'web3-eth/types/index'

const scoreCache = new Map<string, BigNumber>();

export type BlockSignatureCount = {
	signedBlocks: number;
	eligibleBlocks: number;
	totalBlocks: number;
};

/** Monitor the health of our validators */
export default class MonitorValidators extends MonitorBase {
	protected async run() {
		const validators = await this.kit.contracts.getValidators();
		const election = await this.kit.contracts.getElection();

		// Get currently elected validators
		const epochSize = await validators.getEpochSize();
		const electionCache = new ElectionResultsCache(
			election,
			epochSize.toNumber()
		);

		// Get validators that _will_ be elected
		const validatorSigners = await this.getValidatorSigners();
		const validatorSetSize = await election.numberValidatorsInSet(this.blocks[this.blocks.length - 1].number)
		
		console.debug("There are " + validatorSetSize + " validators in the elected set");
		const frontRunnerSigners = await election.electValidatorSigners();

		// Monitor signatures of each of our validators
		for (const validator of validatorSigners.keys()) {
			const signer = validatorSigners.get(validator) || "";

			// Monitor our validator score
			const validatorAccount = await validators.getValidatorFromSigner(signer);
			this.metrics.log(
				"ValidatorScore",
				validatorAccount.score.toNumber(),
				this.addresses.alias(validatorAccount.address)
			);
			await this.alertIfValidatorScoreDecreased(
				validator,
				new BigNumber(validatorAccount.score)
			);

			// Monitor being voted in our out of the active set
			const isElected = await electionCache.elected(
				signer,
				this.latestBlock.number - 1
			);
			const willBeElected = frontRunnerSigners.indexOf(signer) >= 0;
			await this.alertOnElectionStatusChange(
				validator,
				isElected,
				willBeElected
			);

			const signatures = await this.checkBlockSignatures(
				electionCache,
				validator,
				signer,
				this.blocks
			);
			this.alertOnMissedSignatures(validator, signatures, signer);
			this.alertOnMissedBlocks(validator, validatorSetSize, signatures, signer, this.blocks)
		}
	}

	/** Slack if we've missed one block, Page if we've missed all of them */
	async alertOnMissedBlocks(
		validator: string,
		validatorSetSize: number,
		signatures: BlockSignatureCount,
		signer: string,
		blocks: Block[]
	) {
		// Alert if we're not proposing blocks
		const proposedBlockCount = blocks.filter((b) => b.miner === signer).length;
		const expectedBlockCount = Math.floor(signatures.eligibleBlocks / validatorSetSize)
		const missedBlockCount = Math.max(expectedBlockCount - proposedBlockCount,0);

		console.debug(`monitorValidator::alertOnMissedBlocks: blocks.length ${blocks.length} proposedBlockCount ${proposedBlockCount}, expectedBlockCount ${expectedBlockCount}, missedBlockCount ${missedBlockCount}`);

		// Discord if we've missed one block
		if (missedBlockCount > 0) {
			
			// Ignore single block misses near epoch transitions
			if (!this.doBlocksIncludeEpochTransition()) {
				await this.alert.discordWarn(
					`\`${this.addresses.alias(
						validator
					)}\` missed proposing \`${missedBlockCount}/${expectedBlockCount}\` blocks. Are we healthy? ${discordSignerBlocksProposed(
						signer
					)}`,
					60 * 10,
					`${this.addresses.alias(validator)} is failing to propose blocks`
				);
			}
		}
		
		// Page if we've missed all blocks
		if (expectedBlockCount > 0 && proposedBlockCount == 0) {
			await this.alert.page(
				`Celo Validator Not Proposing Blocks`,
				`${this.addresses.alias(
					validator
				)} missed mining ${missedBlockCount}/${expectedBlockCount} blocks. Are we offline? See: ${addressExplorerUrl(
					signer
				)}`,
				60 * 10,
				`${this.addresses.alias(validator)} is missing blocks`
			);
		}
		this.metrics.log("MissedBlocks",
			missedBlockCount,
			this.addresses.alias(validator)
		);
	}

	/** Slack or Page when we're missing too many signatures */
	async alertOnMissedSignatures(
		validator: string,
		signatures: BlockSignatureCount,
		signer: string
	) {
		// Alert when we're missing many block signatures
		const missedSignatures = signatures.eligibleBlocks - signatures.signedBlocks;
		console.debug("missedSignatures = " + missedSignatures)
		// Take miss percentage against total blocks so we don't page when
		// e.g. missed 1/1 sigs at the start of a cycle
		const missPercentage = missedSignatures / signatures.totalBlocks;
		console.debug("missPercentage = " + missPercentage + " which is " + missPercentage * 100 + "%")

		const warnPercentage = Number(process.env.MISSED_SIGNATURE_WARN_PCT) || 0.1;
		const pagePercentage = Number(process.env.MISSED_SIGNATURE_PAGE_PCT) || 0.5;

		console.debug("warnPercentage = + " + warnPercentage)
		if (missPercentage > warnPercentage) {
			console.debug("missPercentage is > warnPercentage")
		} else {
			console.debug("missPercentage is < warnPercentage")
		}

		// Message when we're missing % of blocks
		if (missPercentage > warnPercentage) {
			await this.alert.discord(this.addresses.alias(validator) + ' missed signing ' + missedSignatures + ' of last ' + signatures.eligibleBlocks + ' (' + missPercentage*100 
			+ '%) blocks.\n' 
			+ 'Is this validator signer offline?\n' + discordSignerDowntime(signer),
				60 * 5,
				`${this.addresses.alias(validator)} is missing signatures`
			);
		}
		
		// Page when we're missing > % of blocks
		
		if (missPercentage > pagePercentage) {
			return
			/* await this.alert.page(
				`Celo Validator Missing Signatures`,
				`${this.addresses.alias(validator)} has missed ${missedSignatures}/${
					signatures.eligibleBlocks
				} signatures. Is this validator signer offline?  See: https://explorer.celo.org/address/${signer}/downtime`,
				60 * 10,
				`${this.addresses.alias(validator)} is missing signatures`
			); */
		} 
	}

	/** Check block signatures for misses */
	async checkBlockSignatures(
		electionCache: ElectionResultsCache,
		validator: string,
		signer: string,
		blocks: Block[]
	): Promise<BlockSignatureCount> {
		const signatures: BlockSignatureCount = {
			signedBlocks: 0,
			eligibleBlocks: 0,
			totalBlocks: blocks.length,
		};
		const offlineWindowSize = 12;
		let sequentialMisses = 0;

		for (const block of blocks) {
			if (await electionCache.elected(signer, block.number - 1)) {
				signatures.eligibleBlocks++;
				if (await electionCache.signedParent(signer, block)) {
					// TODO: Log the total number of signatures per block so we can graph
					// when other people are missing signatures too
					signatures.signedBlocks++;
					sequentialMisses = 0;
				} else {
					sequentialMisses++;
					console.debug("sequentialMisses: " + sequentialMisses)

					const missedBlockNumber = block.number - 1;
					await this.metrics.logUnique(
						`${validator}-missed-sig-${missedBlockNumber}`,
						"MissedSignature",
						missedBlockNumber,
						this.addresses.alias(validator)
					);

					// Have we been offline long enough for our score to decrease?
					if (sequentialMisses >= offlineWindowSize) {
						// Alert on score decrease and subsequent 10 misses
						if (
							sequentialMisses == offlineWindowSize ||
							sequentialMisses % 10 == 0
						) {
							await this.alert.discordError(
								`\`${this.addresses.alias(
									validator
								)}\` hasn't signed \`${sequentialMisses}\` sequential blocks at block \`${
									block.number
								}\` and is considered offline ${discordSignerDowntime(
									signer
								)}`,
								30 * 60,
								`${validator}-${sequentialMisses}-sequential_missed_signatures`
							);
						}
					}
				}
			}
		}

		const missedSignatures =
			signatures.eligibleBlocks - signatures.signedBlocks;
		this.metrics.log(
			"MissedSignatures",
			missedSignatures,
			this.addresses.alias(validator)
		);

		return signatures;
	}

	/** Return a map of all Validator Addresses => Validator Signer Addresses */
	async getValidatorSigners(): Promise<Map<string, string>> {
		const validators = await this.kit.contracts.getValidators();
		const accounts = await this.kit.contracts.getAccounts();

		const validatorSigners = new Map<string, string>();
		for (const groupAddress of this.addresses.groups()) {
			if (await validators.isValidatorGroup(groupAddress)) {
				console.debug(
					`Processing group: \`${this.addresses.alias(groupAddress)}\``
				);
				const validatorGroup = await validators.getValidatorGroup(groupAddress);
				for (const validator of validatorGroup.members) {
					console.debug(`> Validator: ${validator}`);
					const signer = await accounts.getValidatorSigner(validator);
					if (await accounts.isSigner(signer)) {
						console.debug(` > Signer: ${signer}`);
						validatorSigners.set(validator, signer);
					}
				}
			}
		}
		return validatorSigners;
	}

	/** Alert if validator score has decreased */
	async alertIfValidatorScoreDecreased(validator: string, score: BigNumber) {
		if (scoreCache.has(validator)) {
			if (scoreCache.get(validator)?.isGreaterThan(score)) {
				// Our score has sadly decreased. let us know.
				await this.alert.discordError(
					`\`${this.addresses.alias(
						validator
					)}\`'s score has decreased from \`${scoreCache.get(
						validator
					)}\` to \`${score}\`. Have we done wrong!?`,
					2 * 60 * 60
				);
			}
		}
		scoreCache.set(validator, score);
	}

	/** Alert if we're about to be voted in or out of the active set */
	async alertOnElectionStatusChange(
		validator: string,
		isElected: boolean,
		willBeElected: boolean
	) {
		if (isElected && !willBeElected) {
			// We're about to get kicked out of the active set. Slack alert.
			await this.alert.discordWarn(
				`\`${this.addresses.alias(
					validator
				)}\` doesn't have enough votes to remain in the active set ${discordAddressDetails(
					validator
				)}`,
				2 * 60 * 60
			);
		}
		if (!isElected && willBeElected) {
			// We're about to enter the active set. yay!
			await this.alert.discord(
				`\`${this.addresses.alias(
					validator
				)}\` is scheduled to be elected.  Yay! ${discordAddressDetails(
					validator
				)}`,
				24 * 60 * 60
			);
		}
	}
}
