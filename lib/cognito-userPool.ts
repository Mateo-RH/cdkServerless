import { Construct } from '@aws-cdk/core';
import { Vpc, SecurityGroup } from '@aws-cdk/aws-ec2';
import {
  OAuthScope,
  UserPool,
  UserPoolClientIdentityProvider,
  UserPoolOperation,
} from '@aws-cdk/aws-cognito';
import { Function, Code, Runtime } from '@aws-cdk/aws-lambda';

export interface CognitoUserPoolProps {
  vpc: Vpc;
  securityGroup: SecurityGroup;
  dbInstanceName: string;
  dbHostName: string;
  dbUserName: string;
  dbUserPassword: string;
}

export class CognitoUserPool extends Construct {
  public readonly id: string;

  constructor(scope: Construct, id: string, props: CognitoUserPoolProps) {
    super(scope, id);

    const pool = new UserPool(this, 'MyUserPool', {
      userPoolName: 'pool',
      selfSignUpEnabled: true,
      signInCaseSensitive: false,
      signInAliases: {
        username: true,
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        fullname: {
          required: true,
          mutable: true,
        },
      },
    });
    this.id = pool.userPoolId;
    // Domain
    pool.addDomain('MyCognitoDomain', {
      cognitoDomain: {
        domainPrefix: 'client',
      },
    });
    // Clients
    pool.addClient('MyLocalClient', {
      userPoolClientName: 'client-local',
      generateSecret: false,
      preventUserExistenceErrors: true,
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [OAuthScope.OPENID, OAuthScope.COGNITO_ADMIN],
        callbackUrls: ['http://localhost:3000/'],
        logoutUrls: ['http://localhost:3000/'],
      },
      supportedIdentityProviders: [UserPoolClientIdentityProvider.COGNITO],
    });
    pool.addClient('MyProdClient', {
      userPoolClientName: 'client-prod',
      generateSecret: false,
      preventUserExistenceErrors: true,
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [OAuthScope.OPENID, OAuthScope.COGNITO_ADMIN],
        callbackUrls: ['https://url.com/'],
        logoutUrls: ['https://url.com/'],
      },
      supportedIdentityProviders: [UserPoolClientIdentityProvider.COGNITO],
    });

    // Triggers
    const environment = {
      DB_NAME: props.dbInstanceName,
      DB_USER: props.dbUserName,
      DB_PASSWORD: props.dbUserPassword,
      DB_HOST: props.dbHostName,
      DB_PORT: '3306',
    };
    const postConfirmationTrigger = new Function(this, 'MyCognitoPostTrigger', {
      runtime: Runtime.NODEJS_12_X,
      vpc: props.vpc,
      securityGroup: props.securityGroup,
      handler: 'handler.postConfirmation',
      code: Code.fromAsset('lambda/prod'),
      environment,
    });
    const preSignUpTrigger = new Function(this, 'MyCognitoPreTrigger', {
      runtime: Runtime.NODEJS_12_X,
      vpc: props.vpc,
      securityGroup: props.securityGroup,
      handler: 'handler.preSignUp',
      code: Code.fromAsset('lambda/prod'),
      environment,
    });
    const postAuthenticationTrigger = new Function(
      this,
      'MyCognitoPostAuthTrigger',
      {
        runtime: Runtime.NODEJS_12_X,
        vpc: props.vpc,
        securityGroup: props.securityGroup,
        handler: 'handler.postAuthentication',
        code: Code.fromAsset('lambda/prod'),
        environment,
      }
    );
    pool.addTrigger(
      UserPoolOperation.POST_CONFIRMATION,
      postConfirmationTrigger
    );
    pool.addTrigger(UserPoolOperation.PRE_SIGN_UP, preSignUpTrigger);
    pool.addTrigger(
      UserPoolOperation.POST_AUTHENTICATION,
      postAuthenticationTrigger
    );
  }
}
