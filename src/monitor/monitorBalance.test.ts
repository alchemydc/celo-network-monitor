import assert from 'assert';
import sinon from 'ts-sinon';
import BigNumber from 'bignumber.js';
import { BlockTransactionString } from 'web3-eth/types/index'
import { NewMonitorArgs } from "./monitorBase";
import MonitorBalance from './monitorBalance';

describe('monitorBalance', function () {

    it('monitorBalanceChange', async function () {
      const args = NewMonitorArgs()
      const slack = sinon.spy(args.alert, 'slack');
      const warn = sinon.spy(args.alert, 'slackWarn');
      const page = sinon.spy(args.alert, 'page');

      const latestBlock: BlockTransactionString = {
        number: 100,
        hash: "",
        parentHash: "",
        nonce: "",
        sha3Uncles: "",
        logsBloom: "",
        transactionRoot: "",
        stateRoot: "",
        receiptRoot: "",
        miner: "",
        extraData: "",
        gasLimit: 0,
        gasUsed: 0,
        timestamp: 0,
        size: 0,
        difficulty: 0,
        totalDifficulty: 0,
        uncles: new Array(),
        transactions: new Array(),
      }
      args.blocks.push(latestBlock)

      const monitor = new MonitorBalance(args)
      const cache = new Map<string, BigNumber>()

      // Setup
      await monitor.monitorBalanceChange("", new BigNumber(10e18), cache)
      assert(!slack.called)
      assert(!warn.called)
      assert(!page.called)
      slack.resetHistory()
      warn.resetHistory()
      page.resetHistory()

      // Increase
      await monitor.monitorBalanceChange("", new BigNumber(100e18), cache)
      assert(slack.called)
      assert(!warn.called)
      assert(!page.called)
      slack.resetHistory()
      warn.resetHistory()
      page.resetHistory()

      // Decrease
      await monitor.monitorBalanceChange("", new BigNumber(80e18), cache)
      assert(!slack.called)
      assert(warn.called)
      assert(!page.called)
      slack.resetHistory()
      warn.resetHistory()
      page.resetHistory()

      // No Change
      await monitor.monitorBalanceChange("", new BigNumber(80e18), cache)
      assert(!slack.called)
      assert(!warn.called)
      assert(!page.called)
      slack.resetHistory()
      warn.resetHistory()
      page.resetHistory()

      // No Tiny Change
      await monitor.monitorBalanceChange("", new BigNumber(80.1e18), cache)
      assert(!slack.called);
      assert(!page.called);
      slack.resetHistory()
      warn.resetHistory()
      page.resetHistory()
  });
});
