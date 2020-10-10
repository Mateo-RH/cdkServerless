## API with Lambda

If you remember well in the first section we discuss that our goal it's to make the lambdas able to comunicate to an RDS database but also with other AWS services. For this demo we are going to use S3 buckets as an example but you can do it with whatever service you want.

first we are going to install three modules

`$ npm i -s @aws-cdk/aws-lambda@1.66.0 @aws-cdk/aws-apigateway@1.66.0 @aws-cdk/aws-iam@1.66.0`

and then add the inportations on _lib/sample_serverless-stack.ts_

```javascript
import { Function, Code, Runtime } from '@aws-cdk/aws-lambda';
import { ManagedPolicy } from '@aws-cdk/aws-iam';
import { RestApi, LambdaIntegration, Cors } from '@aws-cdk/aws-apigateway';
```

Before continue with the AWS architecture we need to add the lambda functions that we want to deploy, for that create a lambda directory in the root path and add the next files.

_models/Note.js_

```javascript
module.exports = (sequelize, type) => {
  return sequelize.define('note', {
    id: {
      type: type.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: type.STRING,
    description: type.STRING,
  });
};
```

_db.js_

```javascript
const Sequelize = require('sequelize');
const NoteModel = require('./models/Note');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    dialect: 'mysql',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
  }
);

const Note = NoteModel(sequelize, Sequelize);
const Models = { Note };
const connection = {};

module.exports = async () => {
  console.log(process.env.DB_NAME);
  if (connection.isConnected) {
    console.log('=> Using existing connection.');
    return Models;
  }

  await sequelize.sync();
  await sequelize.authenticate();
  connection.isConnected = true;
  console.log('=> Created a new connection.');
  return Models;
};
```

_handler.js_

```javascript
const connectToDatabase = require('./db');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

function HTTPError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const methods = {
  healthCheck: 'GET',
  create: 'POST',
  getOne: 'GET',
  getAll: 'GET',
  update: 'PUT',
  destroy: 'DELETE',
  listS3: 'GET',
};

const getAllfiles = async () => {
  console.log('I enter to lambda');
  const params = {
    Bucket: process.env.BUCKET_NAME,
  };

  return new Promise((resolve, reject) => {
    s3.listObjects(params, (err, data) => {
      if (err) return reject(err);
      resolve(data.Contents);
    });
  });
};

const validateMethod = (httpMethod, method, methods) => {
  if (!methods[method])
    throw new HTTPError(404, `Method: '${method}' not found.`);

  if (httpMethod != methods[method])
    throw new HTTPError(
      400,
      `Invalid request HTTP method: '${httpMethod}' for execution server method: '${method}'`
    );
};

const getHeaders = (method) => {
  return {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': method,
  };
};

module.exports.main = async (event) => {
  try {
    const method = event.pathParameters.method;
    validateMethod(event.httpMethod, method, methods);
    switch (method) {
      case 'healthCheck':
        return await healthCheck(event);
      case 'create':
        return await create(event);
      case 'getOne':
        return await getOne(event);
      case 'getAll':
        return await getAll(event);
      case 'update':
        return await update(event);
      case 'destroy':
        return await destroy(event);
      case 'listS3':
        return await listS3(event);
    }
  } catch (err) {
    const headers = getHeaders('ANY');
    return {
      statusCode: err.statusCode || 500,
      headers: { 'Content-Type': 'text/plain', ...headers },
      body: err.message || 'Internal server error.',
    };
  }
};

const healthCheck = async () => {
  const headers = getHeaders('GET');
  await connectToDatabase();
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Connection successful.' }),
  };
};

const listS3 = async () => {
  const objects = await getAllfiles();
  return {
    statusCode: 200,
    body: JSON.stringify(objects),
  };
};

const create = async (event) => {
  const headers = getHeaders('POST');
  const { Note } = await connectToDatabase();
  const note = await Note.create(JSON.parse(event.body));
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(note),
  };
};

const getOne = async (event) => {
  const headers = getHeaders('GET');
  const { Note } = await connectToDatabase();
  const note = await Note.findByPk(event.pathParameters.id);
  if (!note)
    throw new HTTPError(
      404,
      `Note with id: ${event.pathParameters.id} was not found`
    );
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(note),
  };
};

const getAll = async () => {
  const headers = getHeaders('GET');
  const { Note } = await connectToDatabase();
  const notes = await Note.findAll();
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(notes),
  };
};

const update = async (event) => {
  const headers = getHeaders('PUT');
  const input = JSON.parse(event.body);
  const { Note } = await connectToDatabase();
  const note = await Note.findByPk(event.pathParameters.id);
  if (!note)
    throw new HTTPError(
      404,
      `Note with id: ${event.pathParameters.id} was not found`
    );
  if (input.title) note.title = input.title;
  if (input.description) note.description = input.description;
  await note.save();
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(note),
  };
};

const destroy = async (event) => {
  const headers = getHeaders('DELETE');
  const { Note } = await connectToDatabase();
  const note = await Note.findByPk(event.pathParameters.id);
  if (!note)
    throw new HTTPError(
      404,
      `Note with id: ${event.pathParameters.id} was not found`
    );
  await note.destroy();
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(note),
  };
};
```

This code was taken from [this post](https://enbonnet.me/article/49/construir-api-rest-nodejs-serverless-con-aws-lambda-y-aurora-serverless) and adapted by my for the sake of the demo.

I will go pretty quickly for each file explaining what it does.

First we have our models directory where we can create our schema definitions for the database. for all the database logic we are using the ORM called [Sequilize](https://sequelize.org/).

Next is _db.js_. that file is responsable for connecting us to the database. you can note that is using some env variables that we are going to use for the deployment but also for the test and developing workflow.

And last but not least we have the _handler.js_ that basically creates just one lambda function that routes to the other functions trought the path param _method_. then in the rest of the code you can note that we have a basic set of CRUD functions for the schema _Note.js_ but also a function for listing the files within our S3 bucket trought AWS SDK.

Now your lambdas can be deployed but in order for them to works you need to add the **node_modules**.

`$ cd lambda && npm init -y && npm i -s mysql2 sequelize`

Note that we are not installing the _aws-sdk_ and that is because our lambdas will run in the aws environment where they have access to the SDK by default however in the next sections we are going to show how to run them in a local environment and for that we will need to install that library.

Now, coming back to the _lib/sample_serverless-stack.ts_ we can add the lambda to the stack.

```javascript
const handler = new Function(this, 'MyLambda', {
  runtime: Runtime.NODEJS_10_X,
  vpc,
  securityGroup: LambdaSg,
  handler: 'handler.main',
  code: Code.fromAsset('lambda'),
  environment: {
    DB_NAME: dbInstanceName,
    DB_USER: 'admin',
    DB_PASSWORD: 'Password12345678*',
    DB_HOST: cluster.clusterEndpoint.hostname,
    DB_PORT: '3306',
    BUCKET_NAME: bucket.bucketName,
  },
});
handler.role?.addManagedPolicy(
  ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess')
);
```

We specify where is the lambda code with the attribute _code_ and then we indicate the name of the function in the attribute _handler_.

for the rest of the attributes we use the resources previously created, but it's important to remember **DON'T PUT YOUR CREDENTIALS IN THE CODE**, we are doing this only for dev purposes.

also you can note that we are adding to the lambda a s3 policy of read access. if you are going to access other services dont forget to add the required policies for operate over them.

finally it's time to create our Api gateway for access to our lambdas-

```javascript
const api = new RestApi(this, 'MyEndpoint', {
  deployOptions: { stageName: 'dev' },
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_ORIGINS,
    allowMethods: Cors.ALL_METHODS,
  },
});
api.root
  .resourceForPath('/{method}')
  .addMethod('ANY', new LambdaIntegration(handler));
```

This Api allows all origins and all methods for the Cross Origin Resource Sharing, and thave only one resource (/{mehtod}) for all the HTTP Methods (ANY).

Before deploying we need to [Bootstrap](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html) our stack.

that is because our lambda functions requires extra assets and by bootrstraping our stack we will handled that, otherwise we will not able to deploy.

run:

`$ cdk bootrstrap`

Time to deploy!

`$ npm run build && cdk deploy`

After a successful deployment you can get the API endpoint in the output from the console, or you can look for it in your aws console.

Lets going to check the connection to our database.

`$ curl --request GET '{api-endpoint}/healthCheck'`

if everything goes well you will recive a "Connection successful." but most probably get an "internal server error" and that is because if you remember well our database gets paused after 10 minutes of idle time. so you just have to wait a few seconds an try again.

after a successful response you can start testing the other database methods like:

- create
- getOne
- getAll
- update
- destroy

please review the _handler.js_ code if you need more information of how to consume this methods.

Fine, now we are going to test the comunication with S3 and for that just try:

`$ curl --request GET '{api-endpoint}/listS3'`

you will get an array with the objects stored on your S3. and that way we know that our lambda functions are able to communicate with a private service like RDS but also with public ones like S3.

the last thing if you want to test the CORS try accessing the API from your custom applications or just follow this [link](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-test-cors.html) where amazon teach you how to do it.

[Next](https://github.com/Mateo-RH/cdkServerless/blob/main/Docs/Cognito/cognito.md)
