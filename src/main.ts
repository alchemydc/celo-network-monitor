import KitProvider from "./kitProvider";
import CeloMonitor from "./monitor/monitor";

import dotenv from "dotenv";
import { startBackgroundServer } from "./server";
import { logLevelDebug, logLevelInfo } from "./log";

async function main(): Promise<void> {
	// Load env
	const envFile = process.env.ENV_FILE || ".env-mainnet";
	console.log(dotenv.config({ path: envFile }));
	const debug = process.env.NODE_ENV == "development";

	// Setup the Monitor
	const addressFile = process.env.ADDRESS_FILE || "";
	const monitor = new CeloMonitor(new KitProvider(), addressFile, 200, debug);
	console.log(addressFile);

	// Run forever
	if (debug) {
		logLevelDebug();
		await monitor.monitor();
	} else {
		logLevelInfo();
	}
	startBackgroundServer(monitor);
}

main().catch((err) => {
	console.error(err.stack);
	console.error(err);
	process.exit(1);
});
