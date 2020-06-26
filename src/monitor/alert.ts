import { IncomingWebhook, IncomingWebhookSendArguments } from '@slack/webhook';
import PagerDuty from 'node-pagerduty';

export interface AlertInterface {
    slack(text: string, throttleSeconds?: number, alertKey?: string): Promise<void>
    slackWarn(text: string, throttleSeconds?: number, alertKey?: string): Promise<void>
    slackError(text: string, throttleSeconds?: number, alertKey?: string): Promise<void>
    page(title: string, details: string, throttleSeconds:number, alertKey?: string): Promise<void>
}

export class AlertTest implements AlertInterface {
    async slack(text: string, throttleSeconds: number, alertKey?: string): Promise<void> {}
    async slackWarn(text: string, throttleSeconds: number, alertKey?: string): Promise<void> {}
    async slackError(text: string, throttleSeconds: number, alertKey?: string): Promise<void> {}
    async page(title: string, details: string, throttleSeconds:number, alertKey?: string): Promise<void> {}
}

export default class Alert implements AlertInterface {
    #slackClient: IncomingWebhook;
    #slackChannel: string;
    #slackThrottle: Map<string, Date>;

    #pdClient: any;
    #pdService: string;
    #pdThrottle: Map<string, Date>;

    #debug: boolean

    constructor(slackUrl: string, slackChannel: string, pdKey: string, pdService: string, debug: boolean) {
        this.#slackClient = new IncomingWebhook(slackUrl);
        this.#slackChannel = slackChannel;
        this.#slackThrottle = new Map();

        if (pdKey.length > 0) {
            this.#pdClient = new PagerDuty(pdKey);
        }
        this.#pdService = pdService;
        this.#pdThrottle = new Map();

        this.#debug = debug
    }

    /** Send a slack message */
    async slackWarn(text: string, throttleSeconds=60, alertKey?: string): Promise<void> {
        await this.slack(":warning: " + text, throttleSeconds, alertKey)
    }
    async slackError(text: string, throttleSeconds=60, alertKey?: string): Promise<void> {
        await this.slack(":bangbang: " + text, throttleSeconds, alertKey)
    }
    async slack(text: string, throttleSeconds=60, alertKey?: string): Promise<void> {
        alertKey = alertKey || text;

        if (this.#debug) {
            console.log(`\nWOULD HAVE SLACKED WITH:\n- message: ${text}\n`)
            return
        }

        if (this.shouldAlert(this.#slackThrottle, alertKey, throttleSeconds)) {
            console.log(`Slack Alerting: ${text}`);
            const data: IncomingWebhookSendArguments = {
                channel: this.#slackChannel,
                username: "Celo Network Monitor",
                text: text
            };
            await this.#slackClient.send(data);
        }
    }

    /** Page us */
    async page(title: string, details: string, throttleSeconds=60, alertKey?: string): Promise<void> {
        alertKey = alertKey || title + details

        if (this.#debug) {
            console.log(`\nWOULD HAVE PAGED WITH:\n- title:${title}\n- details:${details}\n`)
            return
        }

        if (this.shouldAlert(this.#pdThrottle, alertKey, throttleSeconds)) {
            console.log(`Paging: ${title}`)
            const payload = {
                incident: {
                  title,
                  type: 'incident',
                  service: {
                    id: this.#pdService,
                    type: 'service_reference',
                  },
                  body: {
                    type: 'incident_body',
                    details,
                  },
                  incident_key: alertKey,
                },
              };

            if (this.#pdClient!=undefined) {
                await this.#pdClient.incidents.createIncident('jack@polychain.capital', payload)
            }
            this.slackError(`Paging with title: \`${title}\``)
        }
    }

    /** if we've already sent this exact alert in the past `x` seconds, then do not re-alert */
    shouldAlert(throttle: Map<string, Date>, key: string, throttleSeconds: number): boolean {
        if (!throttle.has(key)) {
            throttle.set(key, new Date());
            return true;
        }

        const now = new Date().getTime();
        const lastAlertTime = throttle.get(key)?.getTime() || 0;
        const secondsSinceAlerted = (now - lastAlertTime)/1000;

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
    return `https://explorer.celo.org/address/${address}`
}
export function slackAddressDetails(address: string): string {
    if (isValidAddress(address)) {
        return `[<${addressExplorerUrl(address)}|Details>]`
    }
    return ""
}
/** Block Explorer Url */
export function blockExplorerUrl(blockNumber: number): string {
    return `https://explorer.celo.org/blocks/${blockNumber}`
}
export function slackBlockDetails(blockNumber: number): string {
    return `[<${blockExplorerUrl(blockNumber)}|Details>]`
}

function isValidAddress(address: string): boolean {
    return address.match(/^[a-zA-Z0-9]*$/) != null
}
