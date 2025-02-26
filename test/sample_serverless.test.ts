import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as SampleServerless from '../lib/sample_serverless-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new SampleServerless.SampleServerlessStack(app, 'MyTestStack',{
      env: {
        region: process.env.region,
        account: process.env.account,
      },
    });
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
