import fs from "fs";
import yaml from "js-yaml";

export default class Addresses {
	#addresses: Map<string, string>;
	#groups: string[];

	constructor(addressFile?: string) {
		this.#addresses = new Map<string, string>();
		this.#groups = new Array();

		if (addressFile) {
			let raw = fs.readFileSync(addressFile);
			const data = yaml.load(raw);
			// Load all addresses
			for (const entry of Object.keys(data.Addresses)) {
				this.#addresses.set(entry, data.Addresses[entry]);
			}
			// Load groups
			for (const entry of data.GroupAccounts) {
				this.#groups.push(entry);
			}
		}
	}

	addresses() {
		return this.#addresses;
	}
	groups() {
		return this.#groups;
	}
	alias(address: string) {
		return this.#addresses.get(address) || address;
	}
}
