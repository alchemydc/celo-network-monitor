import MonitorBase from "./monitorBase";
import { slackAddressDetails } from "./alert";
import { weiToIntegerFloor, weiToIntegerFloorCommas } from "./formatting";
import BigNumber from "bignumber.js";

let throttler = -1
const usdBalanceCache = new Map<string, BigNumber>()
const goldBalanceCache = new Map<string, BigNumber>()
let lastEpoch = -1

/** Monitor the CELO and cUSD balances of all addresses specified in the addresses yaml file */
export default class MonitorBalance extends MonitorBase {
    protected async run() {
        // This is expensive. Only run once every 10 runs.
        if (++throttler % 10 == 0) {
            // monitor our addresses
            let totalGold = new BigNumber(0)
            let totalLocked = new BigNumber(0)
            let totalUsd = new BigNumber(0)
            for(const address of this.addresses.addresses().keys()) {
                const balance = await this.kit.getTotalBalance(address)
                // Gather Totals
                totalGold = totalGold.plus(balance.gold)
                totalLocked = totalLocked.plus(balance.lockedGold)
                totalUsd = totalUsd.plus(balance.usd)

                // Record non-zero value metrics
                const gold = weiToIntegerFloor(balance.gold)
                if (gold > 0) {
                    this.metrics.log("Gold", gold, this.addresses.alias(address))
                }
                const lockedGold = weiToIntegerFloor(balance.lockedGold)
                if (lockedGold > 0) {
                    this.metrics.log("LockedGold", lockedGold, this.addresses.alias(address))
                }
                const usd = weiToIntegerFloor(balance.usd)
                if (usd > 0) {
                    this.metrics.log("USD", usd, this.addresses.alias(address))
                }
                // Monitor changing balances
                this.monitorGoldBalanceChange(address, balance.gold.plus(balance.lockedGold))
                this.monitorUSDBalanceChange(address, balance.usd)
            }

            // Record Total Metrics
            this.metrics.log("TotalGold", weiToIntegerFloor(totalGold))
            this.metrics.log("TotalLocked", weiToIntegerFloor(totalLocked))
            this.metrics.log("TotalUSD", weiToIntegerFloor(totalUsd))
            // Monitor Changing Totals
            this.monitorGoldBalanceChange("Total Gold", totalGold.plus(totalLocked))
            this.monitorUSDBalanceChange("Total USD", totalUsd)

            this.updateEpochCache()
        }
    }

    /** Manage epoch state ourselves, since this monitor doesn't run every time */
    isProcessingEpochChange() {
        if (lastEpoch < 0) {
            return false
        }
        const currentEpoch = Math.floor(this.latestBlock.number / this.epochSize)
        return lastEpoch != currentEpoch
    }
    /** Update the last epoch that was processed */
    updateEpochCache() {
        const currentEpoch = Math.floor(this.latestBlock.number / this.epochSize)
        lastEpoch = currentEpoch
    }

    async monitorGoldBalanceChange(address:string, balance:BigNumber) {
        this.monitorBalanceChange(address, balance, goldBalanceCache, "", "cgld")
    }

    async monitorUSDBalanceChange(address:string, balance:BigNumber) {
        this.monitorBalanceChange(address, balance, usdBalanceCache, "$", "")
    }
    /** Monitor and record balance changes of the specified address */
    async monitorBalanceChange(address: string, balance: BigNumber, cache: Map<string, BigNumber>, currencyPrefix="", currencySuffix="") {
        if (cache.has(address)) {
            const lastBalance = cache.get(address) || new BigNumber(0)
            const minDeltaToShow = this.isProcessingEpochChange() ? new BigNumber(1e18) : new BigNumber(2e18)

            // Ignore rounding errors
            if (lastBalance.minus(balance).abs().isGreaterThan(minDeltaToShow)) {
                const delta = lastBalance.minus(balance).abs()
                const prettyDelta = weiToIntegerFloorCommas(delta)
                const prettyBalance = weiToIntegerFloorCommas(balance)
                const balanceIncreased = lastBalance.isLessThan(balance)
                const deltaString = balanceIncreased ? "increased" : "decreased"

                // Record the delta metric
                this.metrics.log(`Delta${currencyPrefix}${currencySuffix}`, weiToIntegerFloor(delta), this.addresses.alias(address))

                // Let us know
                const message = `The Balance of \`${this.addresses.alias(address)}\` has` +
                ` ${deltaString} by \`${currencyPrefix}${prettyDelta}${currencySuffix}\`` +
                ` to \`${currencyPrefix}${prettyBalance}${currencySuffix}\`` +
                `${this.getEpochTransitionString()}` +
                ` :money_with_wings: ${slackAddressDetails(address)}`

                // When address is a `total` value, only show on epoch changes
                const addressIsTotal = address.toLowerCase().startsWith('total')
                if (addressIsTotal == this.isProcessingEpochChange()) {
                    if (balanceIncreased) {
                        await this.alert.slack(message)
                    } else {
                        await this.alert.slackWarn(message)
                    }
                }
            }
        }
        cache.set(address, balance)
    }

    /** If the epoch is transitioning, return a human friendly string that indicates as much */
    getEpochTransitionString(): string {
        if (!this.isProcessingEpochChange()) {
            return ""
        }
        return ` at epoch \`${Math.floor(this.latestBlock.number / this.epochSize)}\``
    }
}
