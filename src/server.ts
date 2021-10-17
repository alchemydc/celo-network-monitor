import http from "http";
import CeloMonitor from "./monitor/monitor";

export async function startBackgroundServer(m: CeloMonitor) {
	const requestListener = async function (_: any, res: any) {
		await m.monitor();
		res.writeHead(200);
		res.end("running");
	};
	const server = http.createServer(requestListener);
	const port = process.env.PORT || 8080;
	server.listen(process.env.PORT || 8080);
	console.log(`Serving on: ${port}`);
}
