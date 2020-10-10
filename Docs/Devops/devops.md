## Develop and deploy workflow

### Develop

**Serverless** is a framework for develop and deployment of serverless architecture like lambda function, api gw, etc.

For our development workflow we are going to use serverless along with a plugin only for local testing our lambda functions, and for the database we will use a docker image for mysql.

In the path _lambda/dev/_ you will find the business logic code (lambda functions, database models, etc...) but also 3 additional files for testing and deploy.

- Dockerfile: this is the file we are using for build the dependencies and package our code. **We are using native modules so the dependencies must be installed in the same architecture where the lambdas will run in AWS (amazon linux)**
- docker-compose.yml: this file is for running the required mysql database for our lambdas.
- serverless.yml\_ this is the serverless file where we specify the lambdas, env variables for the setup, and plugin for local testing.

Everything it's already setted up, so you just have to run the next commands in the _lambda/dev/_ directory.

`$ docker-compose up -d`
for lauching the database.

`$ serverless offline`
for deploying the lambdas offline.

**Don't forget to first install the dependencies on _lambda/dev/package-json_**

dev
serverless for offline server
docker-compose for mysql database
dockerfile for modules creation
script for copy the files and volume the modules
cdk will deploy lambdas from the prod
