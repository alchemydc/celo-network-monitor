import BigNumber from "bignumber.js";
// import BigNumber from "@celo/celocli";
import moment from "moment-timezone";

/** Format 1234567.890 like 1,234,567 */
export function formatIntegerWithCommas(num: number): string {
	return Math.floor(num)
		.toString()
		.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Convert a BigNumer of wei tokens to the floor value of integer tokens  */
export function weiToIntegerFloor(num: BigNumber | undefined): number {
	if (num) {
		return num.dividedBy(1e18).integerValue(BigNumber.ROUND_DOWN).toNumber();
	}
	return 0;
}
/** Convert a BigNumer of wei tokens to the floor value of integer tokens  */
export function weiToIntegerFloorCommas(num: BigNumber | undefined): string {
	if (num) {
		return formatIntegerWithCommas(weiToIntegerFloor(num));
	}
	return "0";
}

export function getLocalTimeString(date: Date, format: string): string {
	const timezone = "America/Los_Angeles";
	return moment(date).tz(timezone).format(format);
}
