import {ContractKit, newKit} from '@celo/contractkit';

/** ContractKit Provider returns a fresh ContractKit for you to use. */
export default class KitProvider {
    #rpcUrl: string;

    constructor() {
        // Set RPC URL
        if (process.env.RPC_URL) {
            this.#rpcUrl = process.env.RPC_URL;
        } else {
            this.#rpcUrl = "http://localhost:8545";
        }
    }
    /** Get a new kit */
    getKit(): ContractKit {
        return newKit(this.#rpcUrl);
    }
}
