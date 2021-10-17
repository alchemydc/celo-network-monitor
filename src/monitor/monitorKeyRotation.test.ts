import assert from "assert";
import sinon from "ts-sinon";
import { NewMonitorArgs } from "./monitorBase";
import MonitorKeyRotation from "./monitorKeyRotation";
import BigNumber from "bignumber.js";

describe("monitorKeyRotation", function () {
	it("alertOnRoation", async function () {
		const args = NewMonitorArgs();
		const discord = sinon.spy(args.alert, "discord");
		const error = sinon.spy(args.alert, "discordError");

		const monitor = new MonitorKeyRotation(args);

		// Setup
		await monitor.alertOnRotation({
			name: "",
			address: "",
			affiliation: "",
			score: new BigNumber(1),
			blsPublicKey: "",
			ecdsaPublicKey: "",
			signer: "",
		});
		assert(!discord.called);
		assert(!error.called);
		discord.resetHistory();
		error.resetHistory();

		// Incomplete Change
		await monitor.alertOnRotation({
			name: "",
			address: "",
			affiliation: "",
			score: new BigNumber(1),
			blsPublicKey: "1",
			ecdsaPublicKey: "",
			signer: "",
		});
		assert(!discord.called);
		assert(error.called);
		discord.resetHistory();
		error.resetHistory();

		// Complete Change
		console.log("f");
		await monitor.alertOnRotation({
			name: "",
			address: "",
			affiliation: "",
			score: new BigNumber(1),
			blsPublicKey: "2",
			ecdsaPublicKey: "2",
			signer: "2",
		});
		assert(discord.called);
		assert(!error.called);
		discord.resetHistory();
		error.resetHistory();

		// No Change
		await monitor.alertOnRotation({
			name: "",
			address: "",
			affiliation: "",
			score: new BigNumber(1),
			blsPublicKey: "2",
			ecdsaPublicKey: "2",
			signer: "2",
		});
		assert(!discord.called);
		assert(!error.called);
		discord.resetHistory();
		error.resetHistory();
	});
});
