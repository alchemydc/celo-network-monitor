import assert from "assert";
import sinon from "ts-sinon";
import BigNumber from "bignumber.js";
import MonitorValidators, {BlockSignatureCount} from "./monitorValidators";
import { BlockTransactionString } from "web3-eth/types/index";
import { NewMonitorArgs } from "./monitorBase";
import dotenv from "dotenv";

describe("monitorValidators", function () {

	const envFile = process.env.ENV_FILE || ".env-mainnet";
	console.log(dotenv.config({ path: envFile }));

	it("alertOnMissedBlocks", async function (){

		const args = NewMonitorArgs();
		const validator = "0xvalidator";
		const signer = "0xsigner";
		const validatorSetSize = 110;
		
		const discord = sinon.spy(args.alert, "discord");
		const warn = sinon.spy(args.alert, "discordWarn");
		const error = sinon.spy(args.alert, "discordError");
		const page = sinon.spy(args.alert, "page");
		
		let signatures: BlockSignatureCount = {
			eligibleBlocks: 200,
			signedBlocks: 1,
			totalBlocks: 200,
		};

		const monitor = new MonitorValidators(args);

		let dummyBlock0 : BlockTransactionString = {
			size: 0,
			difficulty: 0,		
			totalDifficulty: 0,
			uncles: [""],
			number: 0,
			hash: "0x1",
			parentHash: "0x0",
			nonce: "1",
			sha3Uncles: "",
			logsBloom: "",
			transactionRoot: "",
			stateRoot: "",
			receiptRoot: "",
			miner: "",
			extraData: "",
			gasLimit: 1,
			gasUsed: 1,
			timestamp: "0",
			transactions: [""]			
		}
		let dummyBlock1 : BlockTransactionString = {
			size: 0,
			difficulty: 0,		
			totalDifficulty: 0,
			uncles: [""],
			number: 0,
			hash: "0x1",
			parentHash: "0x0",
			nonce: "1",
			sha3Uncles: "",
			logsBloom: "",
			transactionRoot: "",
			stateRoot: "",
			receiptRoot: "",
			miner: "",
			extraData: "",
			gasLimit: 1,
			gasUsed: 1,
			timestamp: "0",
			transactions: [""]			
		}
	
		// 1 proposed
		signatures.signedBlocks = 1;
		dummyBlock0.miner = signer;
		dummyBlock1.miner = "notsigner";

		let blocks : BlockTransactionString[] = [dummyBlock0, dummyBlock1];

		await monitor.alertOnMissedBlocks(validator, validatorSetSize, signatures, signer, blocks);
		assert(!discord.called);
		assert(!warn.called);
		assert(!error.called);
		assert(!page.called);
		discord.resetHistory();
		warn.resetHistory();
		error.resetHistory();
		page.resetHistory();

		// 2 proposed
		signatures.signedBlocks = 2;
		dummyBlock0.miner = signer;
		dummyBlock1.miner = signer;

		blocks = [dummyBlock0, dummyBlock1];

		await monitor.alertOnMissedBlocks(validator, validatorSetSize, signatures, signer, blocks);
		assert(!discord.called);
		assert(!warn.called);
		assert(!error.called);
		assert(!page.called);
		discord.resetHistory();
		warn.resetHistory();
		error.resetHistory();
		page.resetHistory();

		// 0 proposed
		signatures.signedBlocks = 0;
		dummyBlock0.miner = "lkjsdlk";
		dummyBlock1.miner = "sdljlkjl";

		blocks = [dummyBlock0, dummyBlock1];

		await monitor.alertOnMissedBlocks(validator, validatorSetSize, signatures, signer, blocks);
		assert(!discord.called);
		assert(warn.called);
		assert(!error.called);
		assert(page.called);
		discord.resetHistory();
		warn.resetHistory();
		error.resetHistory();
		page.resetHistory();
	})
	
	it("alertOnMissedSignatures", async function () {
		
		const args = NewMonitorArgs();
		const discord = sinon.spy(args.alert, "discord");
		const warn = sinon.spy(args.alert, "discordWarn");
		const error = sinon.spy(args.alert, "discordError");
		const page = sinon.spy(args.alert, "page");
		let signatures: BlockSignatureCount = {
			eligibleBlocks: 200,
			signedBlocks: 200,
			totalBlocks: 200,
		};

		const monitor = new MonitorValidators(args);
		const signer = "0x...";

		// 100% Signed
		signatures.signedBlocks = signatures.totalBlocks * 1;
		await monitor.alertOnMissedSignatures("", signatures, signer);
		assert(!discord.called);
		assert(!warn.called);
		assert(!error.called);
		assert(!page.called);
		discord.resetHistory();
		warn.resetHistory();
		error.resetHistory();
		page.resetHistory();

		// 95% Signed
		signatures.signedBlocks = signatures.totalBlocks * 0.95;
		await monitor.alertOnMissedSignatures("", signatures, signer);
		assert(!discord.called);
		assert(!warn.called);
		assert(!error.called);
		assert(!page.called);
		discord.resetHistory();
		warn.resetHistory();
		error.resetHistory();
		page.resetHistory();

		// 93% Signed
		signatures.signedBlocks = signatures.totalBlocks * 0.93;
		await monitor.alertOnMissedSignatures("", signatures, signer);
		assert(!discord.called);
		assert(!warn.called);
		assert(!error.called);
		assert(!page.called);
		discord.resetHistory();
		warn.resetHistory();
		error.resetHistory();
		page.resetHistory();

		// 89% Signed
		signatures.signedBlocks = signatures.totalBlocks * 0.89;
		await monitor.alertOnMissedSignatures("", signatures, signer);
		assert(!discord.calledOnce);
		assert(!warn.calledOnce);
		assert(!error.called);
		assert(!page.called);
		discord.resetHistory();
		warn.resetHistory();
		error.resetHistory();
		page.resetHistory();
	});

	it("alertIfValidatorScoreDecreased", async function () {
		const args = NewMonitorArgs();
		const error = sinon.spy(args.alert, "discordError");
		const monitor = new MonitorValidators(args);

		await monitor.alertIfValidatorScoreDecreased("", new BigNumber(2));
		assert(!error.called);
		error.resetHistory();

		await monitor.alertIfValidatorScoreDecreased("", new BigNumber(2));
		assert(!error.called);
		error.resetHistory();

		await monitor.alertIfValidatorScoreDecreased("", new BigNumber(3));
		assert(!error.called);
		error.resetHistory();

		await monitor.alertIfValidatorScoreDecreased("", new BigNumber(2.5));
		assert(error.called);
		error.resetHistory();
	});

	it("alertOnElectionStatusChange", async function () {
		const args = NewMonitorArgs();
		const discord = sinon.spy(args.alert, "discord");
		const warn = sinon.spy(args.alert, "discordWarn");

		const monitor = new MonitorValidators(args);

		await monitor.alertOnElectionStatusChange("", false, false);
		assert(!discord.called);
		assert(!warn.called);
		discord.resetHistory();
		warn.resetHistory();

		await monitor.alertOnElectionStatusChange("", false, true);
		assert(discord.called);
		assert(!warn.called);
		discord.resetHistory();
		warn.resetHistory();

		await monitor.alertOnElectionStatusChange("", true, false);
		assert(!discord.called);
		assert(warn.called);
		discord.resetHistory();
		warn.resetHistory();
	});
});
