import { Construct } from '@aws-cdk/core';
import { Vpc, SecurityGroup } from '@aws-cdk/aws-ec2';
import { Function, Code, Runtime } from '@aws-cdk/aws-lambda';
import { ManagedPolicy } from '@aws-cdk/aws-iam';

export interface ApiProps {
  vpc: Vpc;
  securityGroup: SecurityGroup;
  userPoolId: string;
  bucketName: string;
  dbInstanceName: string;
  dbHostName: string;
  dbUserName: string;
  dbUserPassword: string;
}

export class Api extends Construct {
  public readonly handler: Function;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    this.handler = new Function(this, 'MyLambda', {
      runtime: Runtime.NODEJS_12_X,
      vpc: props.vpc,
      securityGroup: props.securityGroup,
      handler: 'handler.main',
      code: Code.fromAsset('lambda/prod'),
      environment: {
        DB_NAME: props.dbInstanceName,
        DB_USER: props.dbUserName,
        DB_PASSWORD: props.dbUserPassword,
        DB_HOST: props.dbHostName,
        DB_PORT: '3306',
        BUCKET_NAME: props.bucketName,
        COGNIT_POOL: props.userPoolId,
        EMAIL_SOURCE: 'mateo@comono.co',
      },
    });

    // TODO: create custom policy
    this.handler.role?.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('AmazonSESFullAccess')
    );
    this.handler.role?.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('AmazonCognitoReadOnly')
    );
    this.handler.role?.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('AmazonESCognitoAccess')
    );
    this.handler.role?.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('AmazonCognitoPowerUser')
    );
  }
}
