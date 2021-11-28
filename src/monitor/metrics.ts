export default class Metrics {
	#namespace: string;
	#cache: Map<string, boolean>;

	constructor(namespace: string) {
		this.#namespace = namespace;
		this.#cache = new Map<string, boolean>();
	}

	/** log a metric with a uniqueKey to ensure this is only logged once */
	async logUnique(
		uniqueKey: string,
		key: string,
		value: number,
		identifier?: string
	): Promise<void> {
		if (this.#cache.has(uniqueKey)) {
			return;
		}
		this.#cache.set(uniqueKey, true);
		await this.log(key, value, identifier);
	}

	/** log a Metric */
	async log(key: string, value: number, identifier?: string): Promise<void> {
		if (identifier == undefined) {
			console.debug(
				`namespace="${this.#namespace}" key="${key}", value=${value}`
			);
		} else {
			console.debug(
				`namespace="${
					this.#namespace
				}" key="${key}" value=${value} identifier="${identifier}"`
			);
		}
	}
}
