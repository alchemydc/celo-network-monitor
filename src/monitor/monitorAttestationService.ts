import MonitorBase from "./monitorBase";
import * as WebRequest from "web-request";
import {
	ClaimTypes,
	IdentityMetadataWrapper,
} from "@celo/contractkit/lib/identity";

// Endpoint for healthz.
const ENDPOINT = "/healthz";

/**
 * Monitor Attestation Service liveness.
 * @see https://docs.celo.org/validator-guide/attestation-service#healthcheck
 */
export default class MonitorAttestationService extends MonitorBase {
	protected async run() {
		const accounts = await this.kit.contracts.getAccounts();

		// Iterate through all validators.
		for (const address of this.addresses.addresses().keys()) {
			// Slack and alert if there's a missing signer.
			const hasAuthorizedAttestationSigner =
				await accounts.hasAuthorizedAttestationSigner(address);
			if (!hasAuthorizedAttestationSigner) {
				const message = `Validator missing attestation signer: ${address}`;
				const throttle = 5 * 60;
				const alertKey = `missing-signer-${address}`;

				await this.alert.discordError(message, 60 * 5, alertKey);
				await this.alert.page(
					"Missing attestation signer",
					message,
					throttle,
					alertKey
				);
				return;
			}

			// Slack and alert if there's missing metadata.
			const metadataUrl = await accounts.getMetadataURL(address);
			if (!metadataUrl) {
				const message = `Validator missing metadata url: ${address}`;
				const throttle = 5 * 60;
				const alertKey = `missing-metadata-url-${address}`;

				await this.alert.discordError(message, 60 * 5, alertKey);
				await this.alert.page(
					"Missing metatdata url",
					message,
					throttle,
					alertKey
				);
				return;
			}

			// Slack and alert if there's not attestation claim in metadata.
			const metadata = await IdentityMetadataWrapper.fetchFromURL(
				this.kit,
				metadataUrl
			);
			const attestationServiceUrlClaim = metadata.findClaim(
				ClaimTypes.ATTESTATION_SERVICE_URL
			);
			if (!attestationServiceUrlClaim) {
				const message = `${address} missing attestation claim at url ${metadataUrl}`;
				const throttle = 5 * 60;
				const alertKey = `missing-attestation-claim-${address}`;

				await this.alert.discordError(message, 60 * 5, alertKey);
				await this.alert.page(
					"Missing attestation claim",
					message,
					throttle,
					alertKey
				);
				return;
			}

			const attestationServiceUrl = attestationServiceUrlClaim.url;
			const healthCheckUrl = attestationServiceUrl + ENDPOINT;
			const response = await WebRequest.get(healthCheckUrl);
			console.log(
				`Attestation Service Monitoring returned ${response.statusCode}: ${response.content}`
			);

			// Page and slack if attestation service is unhealthy.
			if (response.statusCode !== 200) {
				const message = `Unhealthy attestation service for ${address} at ${healthCheckUrl}`;
				const throttle = 5 * 60;
				const alertKey = `unhealthy-attestation-${address}`;

				await this.alert.discordError(message, 60 * 5, alertKey);
				await this.alert.page(
					"Unhealthy attestation service",
					message,
					throttle,
					alertKey
				);
				return;
			}
		}
	}
}
