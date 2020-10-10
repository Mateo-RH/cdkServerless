import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { Vpc, SubnetType, SecurityGroup, Port } from '@aws-cdk/aws-ec2';
import { Bucket } from '@aws-cdk/aws-s3';
import { RestApi, LambdaIntegration, Cors } from '@aws-cdk/aws-apigateway';
import { RdsCluster } from './rds-cluster';
import { CognitoUserPool } from './cognito-userPool';
import { Api } from './api';
export class SampleServerlessStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new Vpc(this, 'MyVPC', {
      cidr: '10.0.0.0/16',
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'ingress',
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'application',
          subnetType: SubnetType.PRIVATE,
        },
        {
          cidrMask: 28,
          name: 'rds',
          subnetType: SubnetType.ISOLATED,
        },
      ],
    });
    // Vpc SecGroups
    const LambdaSg = new SecurityGroup(this, 'MyLambdaSG', {
      vpc,
      description: 'Security group for accessing the db instances',
    });
    const RdsSg = new SecurityGroup(this, 'MyRdsSG', {
      vpc,
    });
    RdsSg.addIngressRule(LambdaSg, Port.tcp(3306));

    const cluster = new RdsCluster(this, 'MyServerlessCluster', {
      vpc,
      securityGroup: RdsSg,
    });

    //S3
    const bucket = new Bucket(this, 'MyBucket');

    // Cognito
    const pool = new CognitoUserPool(this, 'MyUserPool', {
      vpc,
      securityGroup: LambdaSg,
      dbHostName: cluster.hostname,
      dbInstanceName: cluster.instanceName,
      dbUserName: cluster.userName,
      dbUserPassword: cluster.userPassword,
    });

    //API
    const api = new Api(this, 'MyApi', {
      vpc,
      securityGroup: LambdaSg,
      dbHostName: cluster.hostname,
      dbInstanceName: cluster.instanceName,
      dbUserName: cluster.userName,
      dbUserPassword: cluster.userPassword,
      userPoolId: pool.id,
      bucketName: bucket.bucketName,
    });

    // ApiGW
    const apiGw = new RestApi(this, 'MyEndpoint', {
      deployOptions: { stageName: 'dev' },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
    });
    apiGw.root
      .resourceForPath('{route}/{method}')
      .addMethod('ANY', new LambdaIntegration(api.handler));
  }
}
