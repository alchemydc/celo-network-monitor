import assert from 'assert';
import sinon from 'ts-sinon';
import BigNumber from 'bignumber.js';
import { NewMonitorArgs } from "./monitorBase";
import MonitorKeyRotation from './monitorKeyRotation';

describe('monitorKeyRotation', function () {

    it('alertOnRoation', async function () {
      const args = NewMonitorArgs()
      const slack = sinon.spy(args.alert, 'slack');
      const error = sinon.spy(args.alert, 'slackError');

      const monitor = new MonitorKeyRotation(args)

      // Setup
      await monitor.alertOnRotation({ name: "", address: "", affiliation: "", score: new BigNumber(1), blsPublicKey: "", ecdsaPublicKey: "", signer: ""})
      assert(!slack.called);
      assert(!error.called);
      slack.resetHistory()
      error.resetHistory()

      // Incomplete Change
      await monitor.alertOnRotation({ name: "", address: "", affiliation: "", score: new BigNumber(1), blsPublicKey: "1", ecdsaPublicKey: "", signer: ""})
      assert(!slack.called);
      assert(error.called);
      slack.resetHistory()
      error.resetHistory()

      // Complete Change
      console.log('f')
      await monitor.alertOnRotation({ name: "", address: "", affiliation: "", score: new BigNumber(1), blsPublicKey: "2", ecdsaPublicKey: "2", signer: "2"})
      assert(slack.called);
      assert(!error.called);
      slack.resetHistory()
      error.resetHistory()

      // No Change
      await monitor.alertOnRotation({ name: "", address: "", affiliation: "", score: new BigNumber(1), blsPublicKey: "2", ecdsaPublicKey: "2", signer: "2"})
      assert(!slack.called);
      assert(!error.called);
      slack.resetHistory()
      error.resetHistory()
  });
});
