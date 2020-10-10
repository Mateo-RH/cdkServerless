#!/usr/bin/env node
import 'source-map-support/register';
import { Environment, Aws, App, Construct } from '@aws-cdk/core';
import { SampleServerlessStack } from '../lib/sample_serverless-stack';

const defaultEnv: Environment = {
  account: Aws.ACCOUNT_ID,
  region: 'eu-central-1',
};

const app = new App();
class ServerlessCdkStack extends Construct {
  constructor(scope: Construct, id: string, env: Environment) {
    super(scope, id);
    new SampleServerlessStack(this, 'SampleServerlessStack', { env });
  }
}

new ServerlessCdkStack(app, 'dev', defaultEnv);
