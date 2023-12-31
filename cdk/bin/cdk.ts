#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {LambdaStack} from '../lib/lambda-stack';
import {DynamoDBStack} from '../lib/dynamodb-stack';
import {SecretsManagerStack} from '../lib/secretsmanager-stack';

const app = new cdk.App();
const dynamoDBStack = new DynamoDBStack(app, 'GitBotDynamoDBStack');
const secretsManagerStack = new SecretsManagerStack(app, 'GitBotSecretsManagerStack');

// TODO maybe unhardcode this, but OK for now as always want London to minimise latency and for data residency purposes.
new LambdaStack(app, 'GitBotLambdaStack', {
  env: {region: 'eu-west-2'},
  userDataTable: dynamoDBStack.userDataTable,
  stateTable: dynamoDBStack.stateTable,
  projectConfigTable: dynamoDBStack.projectConfigTable,
  gitBotSecret: secretsManagerStack.gitBotSecret
});

