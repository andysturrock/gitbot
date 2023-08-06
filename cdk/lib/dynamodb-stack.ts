import {Stack, StackProps, RemovalPolicy} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class DynamoDBStack extends Stack {
  public readonly slackIdToGitLabTokenTable: dynamodb.Table;
  public readonly stateTable: dynamodb.Table;
  public readonly pipelineConfigTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.slackIdToGitLabTokenTable = new dynamodb.Table(this, 'SlackIdToGitLabTokenTable', {
      tableName: "SlackIdToGitLabToken",
      partitionKey: {name: 'slack_id', type: dynamodb.AttributeType.STRING},
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiry',
      removalPolicy: RemovalPolicy.DESTROY
    });

    this.stateTable = new dynamodb.Table(this, 'StateTable', {
      tableName: "State",
      partitionKey: {name: 'nonce', type: dynamodb.AttributeType.STRING},
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiry',
      removalPolicy: RemovalPolicy.DESTROY
    });

    this.pipelineConfigTable = new dynamodb.Table(this, 'PipelineConfigTable', {
      tableName: "PipelineConfig",
      partitionKey: {name: 'pipeline_id', type: dynamodb.AttributeType.STRING},
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiry',
      removalPolicy: RemovalPolicy.DESTROY
    });

    // Create exports from the CF template so that CF knows that other stacks depend on this stack.
    this.exportValue(this.slackIdToGitLabTokenTable.tableArn);
    this.exportValue(this.stateTable.tableArn);
    this.exportValue(this.pipelineConfigTable.tableArn);
  }
}
