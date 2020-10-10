#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { SampleServerlessStack } from '../lib/sample_serverless-stack';

const app = new cdk.App();
new SampleServerlessStack(app, 'SampleServerlessStack');
