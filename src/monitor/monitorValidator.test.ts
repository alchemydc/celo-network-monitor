import assert from 'assert';
import sinon from 'ts-sinon';
import BigNumber from 'bignumber.js';
import MonitorValidators, { BlockSignatureCount } from "./monitorValidators"
import { NewMonitorArgs } from "./monitorBase";

describe('monitorValidators', function () {

    it('alertOnMissedSignatures', async function () {
      const args = NewMonitorArgs()
      const slack = sinon.spy(args.alert, 'slack');
      const warn = sinon.spy(args.alert, 'slackWarn');
      const error = sinon.spy(args.alert, 'slackError');
      const page = sinon.spy(args.alert, 'page');
      let signatures: BlockSignatureCount = { eligibleBlocks: 200, signedBlocks: 200, totalBlocks: 200 }

      const monitor = new MonitorValidators(args)

      // 100% Signed
      signatures.signedBlocks = signatures.totalBlocks * 1
      await monitor.alertOnMissedSignatures("", signatures)
      assert(!slack.called);
      assert(!warn.called);
      assert(!error.called);
      assert(!page.called);
      slack.resetHistory()
      warn.resetHistory()
      error.resetHistory()
      page.resetHistory()

      // 95% Signed
      signatures.signedBlocks = signatures.totalBlocks * .95
      await monitor.alertOnMissedSignatures("", signatures)
      assert(!slack.called);
      assert(!warn.called);
      assert(!error.called);
      assert(!page.called);
      slack.resetHistory()
      warn.resetHistory()
      error.resetHistory()
      page.resetHistory()

      // 80% Signed
      signatures.signedBlocks = signatures.totalBlocks * .8
      await monitor.alertOnMissedSignatures("", signatures)
      assert(!slack.calledOnce);
      assert(warn.called);
      assert(!error.called);
      assert(!page.called);
      slack.resetHistory()
      warn.resetHistory()
      error.resetHistory()
      page.resetHistory()

      // 40% Signed
      signatures.signedBlocks = signatures.totalBlocks * .4
      await monitor.alertOnMissedSignatures("", signatures)
      assert(!slack.calledOnce);
      assert(warn.called);
      assert(!error.called);
      assert(page.calledOnce);
      slack.resetHistory()
      warn.resetHistory()
      error.resetHistory()
      page.resetHistory()
  });

  it('alertIfValidatorScoreDecreased', async function () {
      const args = NewMonitorArgs()
      const error = sinon.spy(args.alert, 'slackError');
      const monitor = new MonitorValidators(args)

      await monitor.alertIfValidatorScoreDecreased("", new BigNumber(2))
      assert(!error.called);
      error.resetHistory()

      await monitor.alertIfValidatorScoreDecreased("", new BigNumber(2))
      assert(!error.called);
      error.resetHistory()

      await monitor.alertIfValidatorScoreDecreased("", new BigNumber(3))
      assert(!error.called);
      error.resetHistory()

      await monitor.alertIfValidatorScoreDecreased("", new BigNumber(2.5))
      assert(error.called);
      error.resetHistory()
  });

  it('alertOnElectionStatusChange', async function () {
    const args = NewMonitorArgs()
    const slack = sinon.spy(args.alert, 'slack');
    const warn = sinon.spy(args.alert, 'slackWarn');

    const monitor = new MonitorValidators(args)

    await monitor.alertOnElectionStatusChange("", false, false)
    assert(!slack.called);
    assert(!warn.called);
    slack.resetHistory()
    warn.resetHistory()

    await monitor.alertOnElectionStatusChange("", false, true)
    assert(slack.called);
    assert(!warn.called);
    slack.resetHistory()
    warn.resetHistory()

    await monitor.alertOnElectionStatusChange("", true, false)
    assert(!slack.called);
    assert(warn.called);
    slack.resetHistory()
    warn.resetHistory()
  });

});
