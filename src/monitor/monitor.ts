import Alert from "./alert";
import MonitorNode from "./monitorNode";
import KitProvider from "../kitProvider";
import MonitorBalance from "./monitorBalance";
import MonitorValidators from "./monitorValidators";
import MonitorElectabilityThreshold from "./monitorElectabilityThreshold";
import MonitorGovernance from "./monitorGovernance";
import MonitorPendingVotes from "./monitorPendingVotes";
import MonitorTobinTax from "./monitorTobinTax";
import MonitorVoteCapacity from "./monitorVoteCapacity";
import { BlockTransactionString } from "web3-eth/types/index";
import { concurrentMap } from "@celo/utils/lib/async";
import { ContractKit } from "@celo/contractkit";
import Addresses from "./addresses";
import MonitorBase, { MonitorArgs } from "./monitorBase";
import MonitorNetworkParticipation from "./monitorNetworkParticipation";
import MonitorKeyRotation from "./monitorKeyRotation";
import { nodeIsSynced } from "@celo/celocli/lib/utils/helpers";
//import MonitorAttestationService from "./monitorAttestationService";

export default class CeloMonitor {
	#provider: KitProvider;
	#alert: Alert;
	#blocksToScan: number;
	#addresses: Addresses;
	#debug: boolean;
	#lastBlockProcessed: number = -1;

	constructor(
		provider: KitProvider,
		addressFile: string,
		blocksToScan: number,
		debug: boolean
	) {
		this.#provider = provider;
		this.#blocksToScan = blocksToScan;
		this.#alert = new Alert(debug);
		this.#addresses = new Addresses(addressFile);
		this.#debug = debug;
		console.log(`CeloMonitor() - Constructor`);
	}

	async monitor() {
		// Startup
		console.log(`CeloMonitor() - Running`);
		const start = new Date().getTime();
		// Load vars
		const kit = this.#provider.getKit();
		const args: MonitorArgs = {
			kit: kit,
			lastBlockProcessed: this.#lastBlockProcessed,
			blocks: await this.getBlocks(kit),
			alert: this.#alert,
			addresses: this.#addresses,
		};

		// Check node
		await new MonitorNode(args).monitor();
		// Collect all monitors
		let monitors = [
			//new MonitorAttestationService(args),
			new MonitorBalance(args),
			new MonitorElectabilityThreshold(args),
			new MonitorGovernance(args),
			new MonitorKeyRotation(args),
			new MonitorNetworkParticipation(args),
			new MonitorPendingVotes(args),
			new MonitorTobinTax(args),
			new MonitorValidators(args),
			new MonitorVoteCapacity(args),
		];

		if (!(await nodeIsSynced(kit.web3))) {
			console.log("Node must be synced to monitor. Exiting.");
			return;
		}

		if (this.#debug) {
			await this.runSerial(monitors);
		} else {
			await this.runParallel(monitors);
		}

		// Record Processing
		this.#lastBlockProcessed = args.blocks[args.blocks.length - 1].number;

		// Print runtime
		const duration = Math.floor(new Date().getTime() - start) / 1000;
		console.log(`CeloMonitor() - Finished in ${duration}s`);
	}

	async runParallel(monitors: MonitorBase[]) {
		const promises = Array<Promise<void>>();
		for (const m of monitors) {
			promises.push(m.monitor());
		}
		await Promise.all(promises);
	}

	async runSerial(monitors: MonitorBase[]) {
		for (const m of monitors) {
			await m.monitor();
		}
	}

	/** Get the most recent #blocksToScan blocks */
	async getBlocks(kit: ContractKit): Promise<BlockTransactionString[]> {
		const latestBlock = await kit.web3.eth.getBlock("latest");
		return await concurrentMap(10, [...Array(this.#blocksToScan).keys()], (i) =>
			kit.web3.eth.getBlock(latestBlock.number - this.#blocksToScan + i + 1)
		);
	}
}
