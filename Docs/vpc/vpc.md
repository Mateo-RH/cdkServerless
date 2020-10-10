## Custom VPC

The main idea is to have an API that can comunicates with a DB instance managed by RDS and also communicate with other AWS services like Cognito, SES, and S3.

Our VPC must have:

- a public subnet for internet access.
- a private subnet for our lambda functions.
- an isolated subnet for our Database

First of all we need the aws-ec2 module for using the vpc

`$ npm i -s @aws-cdk/aws-ec2@1.66.0`

_Note the @1.66.0 at the end, that is because my cdk core is in that version. you must ensure that all the cdk modules are in the same version of your cdk core in order to avoid some issues._

Next in _lib/sample_serverless-stack.ts_ we import the next resources from the module.

```javascript
import { Vpc, SubnetType, SecurityGroup, Port } from '@aws-cdk/aws-ec2';
```

And create the VPC with two AZ's and the three subnets mentioned before, that means that in total we will have 6 Subnets (3 per AZ).

```javascript
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
```

We select two availability zones because RDS: Aurora it's high available and it requires a minimum of 2 AZ's.

- the public subnet is routed to an Internet Gateway and there is where the NAT GW's are placed.
- the private subnet is where our lambdas are placed and routed to the NAT Gw in order to make calls to other AWS services trought AWS SDK like S3 and Cognito.
- the isolated subnet is only accessible from resources placed in the same subnet and it's where we are deploying our database.

Finally, we are going to create two security groups (lambda security group and RDS security group)

```javascript
const LambdaSg = new SecurityGroup(this, 'MyLambdaSG', {
  vpc,
  description: 'Security group for accessing the db instances',
});
const RdsSg = new SecurityGroup(this, 'MyRdsSG', {
  vpc,
});
RdsSg.addIngressRule(LambdaSg, Port.tcp(3306));
```

The lambda security group is where we are placing our lambdas and the RDS security group has an inbound rule from the lambda sg trought the port 3306 (the default MySQL port). that means that our lambdas will be the only ones allowed to access our database.

Now you can deploy and check the AWS console to ensure that everything works.

`$ npm run build && cdk deploy`

[Next](https://github.com/Mateo-RH/cdkServerless/blob/main/Docs/S3/s3.md)
