import { Webhook } from "discord-webhook-node";
//import { event } from "@pagerduty/pdjs";
import Web3 from "web3";
export interface AlertInterface {
	discord(
		text: string,
		throttleSeconds?: number,
		alertKey?: string
	): Promise<void>;
	discordWarn(
		text: string,
		throttleSeconds?: number,
		alertKey?: string
	): Promise<void>;
	discordError(
		text: string,
		throttleSeconds?: number,
		alertKey?: string
	): Promise<void>;
	page(
		title: string,
		details: string,
		throttleSeconds: number,
		alertKey?: string
	): Promise<void>;
}
export class AlertTest implements AlertInterface {
	async discord(
		text: string,
		throttleSeconds: number,
		alertKey?: string
	): Promise<void> {}
	async discordWarn(
		text: string,
		throttleSeconds: number,
		alertKey?: string
	): Promise<void> {}
	async discordError(
		text: string,
		throttleSeconds: number,
		alertKey?: string
	): Promise<void> {}
	async page(
		title: string,
		details: string,
		throttleSeconds: number,
		alertKey?: string
	): Promise<void> {}
}

export default class Alert implements AlertInterface {
	#discordThrottle: Map<string, Date>;
	#discordHook: Webhook;
	#pdThrottle: Map<string, Date>;
	#debug: boolean;

	constructor(debug: boolean) {
		this.#discordThrottle = new Map();
		this.#pdThrottle = new Map();
		this.#debug = debug;
		this.#discordHook = new Webhook(process.env.DISCORD_WEBHOOK_URL || "");
		console.log("Alerting to " + process.env.DISCORD_WEBHOOK_URL);
	}

	/* Send a Discord message */
	async discord(
		text: string,
		throttleSeconds: number = 60,
		alertKey: string = Web3.utils.keccak256(text)
	): Promise<void> {
		if (this.#debug) {
			console.log(`\nWOULD HAVE SLACKED WITH:\n- message: ${text}\n`);
			//return;
		}
		if (this.shouldAlert(this.#discordThrottle, alertKey, throttleSeconds)) {
			console.log(`Discord Info Alerting: ${text}`);
			this.#discordHook.setUsername("Celo Validator Monitor Service");
			this.#discordHook.send(text);
		}
	}

	async discordWarn(
		text: string,
		throttleSeconds = 60,
		alertKey: string = Web3.utils.keccak256(text)
	): Promise<void> {
		if (this.shouldAlert(this.#discordThrottle, alertKey, throttleSeconds)) {
			console.log(`Discord Warning Alerting: ${text}`);
			await this.#discordHook.warning(
				`**${process.env.PD_SOURCE_DESCRIPTOR}**`,
				"Warning",
				text
			);
		}
	}

	async discordError(
		text: string,
		throttleSeconds = 60,
		alertKey: string = Web3.utils.keccak256(text)
	): Promise<void> {
		if (this.shouldAlert(this.#discordThrottle, alertKey, throttleSeconds)) {
			console.log(`Discord Error Alerting: ${text}`);
			await this.#discordHook.warning(
				`**${process.env.PD_SOURCE_DESCRIPTOR}**`,
				"Warning",
				text
			);
		}
	}

	async page(
		title: string,
		details: string,
		throttleSeconds = 60,
		alertKey?: string
	): Promise<void> {
		alertKey = Web3.utils.keccak256(alertKey || title + details);

		if (this.#debug) {
			console.log(
				`\nWOULD HAVE PAGED WITH:\n- title:${title}\n- details:${details}\n`
			);
			//return;
		}

		if (this.shouldAlert(this.#pdThrottle, alertKey, throttleSeconds)) {
			console.log(`Paging: ${title}`);

			/* event({
				data: {
					routing_key: process.env.PD_EVENTS_ROUTING_KEY || "YOUR_ROUTING_KEY",
					event_action: "trigger",
					dedup_key: alertKey,
					payload: {
						summary: title,
						source: process.env.PD_SOURCE_DESCRIPTOR || "monitor",
						severity: "error",
					},
				},
			})
				.then(console.log)
				.catch(console.error);

			this.discord(`Paging with title: \`${title}\``); */
		}
	}

	/** if we've already sent this exact alert in the past `x` seconds, then do not re-alert */
	shouldAlert(
		throttle: Map<string, Date>,
		key: string,
		throttleSeconds: number
	): boolean {
		if (!throttle.has(key)) {
			throttle.set(key, new Date());
			return true;
		}

		const now = new Date().getTime();
		const lastAlertTime = throttle.get(key)?.getTime() || 0;
		const secondsSinceAlerted = (now - lastAlertTime) / 1000;

		if (secondsSinceAlerted > throttleSeconds) {
			// We've passed our throttle delay period
			throttle.set(key, new Date());
			return true;
		}
		return false;
	}
}

/** Address Explorer Url */
export function addressExplorerUrl(address: string): string {
	return `https://explorer.celo.org/address/${address}`;
}
export function discordAddressDetails(address: string): string {
	if (isValidAddress(address)) {
		//return `[<${addressExplorerUrl(address)}|Details>]`;
		return `${addressExplorerUrl(address)}`;
	}
	return "";
}
/** Block Explorer Url */
export function blockExplorerUrl(blockNumber: number): string {
	return `https://explorer.celo.org/blocks/${blockNumber}`;
}
export function slackBlockDetails(blockNumber: number): string {
	//return `[<${blockExplorerUrl(blockNumber)}|Details>]`;
	return `[<${blockExplorerUrl(blockNumber)}]`;
}

function isValidAddress(address: string): boolean {
	return address.match(/^[a-zA-Z0-9]*$/) != null;
}
