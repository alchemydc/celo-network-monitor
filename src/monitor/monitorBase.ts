import { ContractKit } from "@celo/contractkit";
import { AlertInterface, AlertTest } from "./alert";
import { BlockTransactionString } from 'web3-eth/types/index'
import Metrics from "./metrics";
import Addresses from "./addresses";
import Web3 from "web3";

export type MonitorArgs = {
    kit: ContractKit
    blocks: BlockTransactionString[]
    alert: AlertInterface
    addresses: Addresses
    lastBlockProcessed: number
}

export function NewMonitorArgs(): MonitorArgs {
    const args: MonitorArgs = {
        kit: new ContractKit(new Web3()),
        blocks: new Array<BlockTransactionString>(),
        alert: new AlertTest(),
        addresses: new Addresses(),
        lastBlockProcessed: -1
    }
    return args
}

/** Base class that all monitors derive from */
export default abstract class MonitorBase implements MonitorArgs {
    kit: ContractKit
    blocks: BlockTransactionString[]
    alert: AlertInterface
    addresses: Addresses
    lastBlockProcessed: number

    protected metrics: Metrics
    protected latestBlock: BlockTransactionString
    protected readonly epochSize = 17280

    constructor(args: MonitorArgs) {
        this.kit = args.kit
        this.blocks = args.blocks
        this.alert = args.alert
        this.addresses = args.addresses
        this.lastBlockProcessed = args.lastBlockProcessed

        this.latestBlock = args.blocks[args.blocks.length-1]
        this.metrics = new Metrics(this.constructor.name)
    }

    /** Main method to monitor anything specified in a subclass  */
    async monitor(): Promise<void> {
        console.log(`CeloMonitor::${this.constructor.name}() - Started`)
        const start = new Date().getTime()

        await this.run()

        const duration = Math.floor(new Date().getTime() - start)/1000;
        console.log(`CeloMonitor::${this.constructor.name}() - Finished in ${duration}s`);
    }

    /** Override this to implement monitoring logic */
    protected abstract async run(): Promise<void>

    /** Is this run processing a distinct epoch from the last successful run? */
    isProcessingNewEpoch() {
        // Still initializing.
        if (this.lastBlockProcessed < 0) {
            return false
        }
        const currentEpoch = Math.floor(this.latestBlock.number / this.epochSize)
        const lastEpoch = Math.floor(this.lastBlockProcessed / this.epochSize)
        // Still processing the same epoch.
        if (currentEpoch == lastEpoch) {
            return false
        }
        // Different epochs
        return true
    }

    /** Is `within` number of blocks of a new epoch */
    isNearNewEpoch(within: number): boolean {
        const blocksIntoEpoch = this.latestBlock.number % this.epochSize
        const blocksFromEpoch = Math.min(blocksIntoEpoch, this.epochSize - blocksIntoEpoch)
        return blocksFromEpoch <= within
    }

    /** Do the provided blocks include an epoch transition */
    doBlocksIncludeEpochTransition(): boolean {
        const blocksIntoEpoch = this.latestBlock.number % this.epochSize
        return this.blocks.length > blocksIntoEpoch
    }
}
