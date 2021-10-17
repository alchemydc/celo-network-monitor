import BigNumber from "bignumber.js";
import MonitorBase from "./monitorBase";

let isTobinTaxActive = false;

/** Remind us if/when the Tobin Tax is activated. Never send transactions when it is */
export default class MonitorTobinTax extends MonitorBase {
	protected async run() {
		const reserve = await this.kit.contracts.getReserve();
		const taxComponents = await reserve.getOrComputeTobinTax().txo.call();
		const taxRatio = new BigNumber(taxComponents[0]).dividedBy(
			new BigNumber(taxComponents[1])
		);

		// Alert when it's active and then when it is disabled.
		if (taxRatio.comparedTo(0) == 1) {
			isTobinTaxActive = true;
			await this.alert.discordError(
				`\`The Tobin Tax is activated at a rate of \`${taxRatio}\`. Do NOT send any transactions until this is cleared.`,
				60 * 60
			);
		} else if (taxRatio.comparedTo(0) == 0 && isTobinTaxActive == true) {
			isTobinTaxActive = false;
			await this.alert.discord(`\`The Tobin Tax is no longer active.`, 60 * 60);
		}
	}
}
