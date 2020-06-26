import { slackAddressDetails } from "./alert";
import MonitorBase from "./monitorBase";
import { Validator } from "@celo/contractkit/lib/wrappers/Validators";

export type BlockSignatureCount = {
    signedBlocks: number,
    eligibleBlocks: number,
    totalBlocks: number
}

const validatorCache = new Map<string, Validator>()

/** When validator keys are rotated, ensure that they are fully rotated */
export default class MonitorKeyRotation extends MonitorBase {

    protected async run() {
        for(const validator of await this.getValidatorAccounts()) {
            this.alertOnRotation(validator)
        }
    }

    /** Return a list of all of our validator addresses */
    async getValidatorAccounts(): Promise<Validator[]> {
        const validators = await this.kit.contracts.getValidators()

        let result = new Array<Validator>()
        for (const groupAddress of this.addresses.groups()) {
            if (await validators.isValidatorGroup(groupAddress)) {
                const group = await validators.getValidatorGroup(groupAddress)
                for(const member of group.members) {
                    const validator = await validators.getValidator(member)
                    result.push(validator)
                }
            }
        }
        return result
    }

    /** Alert if keys are rotated, and note if successful or not */
    async alertOnRotation(validator: Validator) {
        const cached = validatorCache.get(validator.address)
        if (cached != undefined) {
            const blsChanged = cached.blsPublicKey != validator.blsPublicKey
            const ecdsaChanged = cached.ecdsaPublicKey != validator.ecdsaPublicKey
            const signerChanged = cached.signer != validator.signer

            if (!blsChanged && !ecdsaChanged && !signerChanged) {
                // nothing has changed
            } else if (blsChanged && ecdsaChanged && signerChanged) {
                await this.alert.slack(
                    `\`${this.addresses.alias(validator.address)}\` has had all` +
                    ` keys rotated ${slackAddressDetails(validator.address)}`
                );
            } else {
                await this.alert.slackError(
                    `INCOMPLETE ROTATION DETECTED for` +
                    ` \`${this.addresses.alias(validator.address)}\`.` +
                    ` bls rotation status: ${blsChanged},` +
                    ` ecdsa rotation status: ${ecdsaChanged}` +
                    ` signing key rotation: ${signerChanged}.` +
                    ` Ensure that keys are properly rotated before the start of the next epoch.` +
                    ` ${slackAddressDetails(validator.address)}`
                );
            }
        }
        validatorCache.set(validator.address, validator)
    }
}
