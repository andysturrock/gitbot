import {Stack, StackProps, RemovalPolicy} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class DynamoDBStack extends Stack {
  public readonly userDataTable: dynamodb.Table;
  public readonly stateTable: dynamodb.Table;
  public readonly projectConfigTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.userDataTable = new dynamodb.Table(this, 'UserDataTable', {
      tableName: "UserData",
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

    this.projectConfigTable = new dynamodb.Table(this, 'ProjectConfigTable', {
      tableName: "ProjectConfig",
      partitionKey: {name: 'project_id', type: dynamodb.AttributeType.NUMBER},
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });

    // Create exports from the CF template so that CF knows that other stacks depend on this stack.
    this.exportValue(this.userDataTable.tableArn);
    this.exportValue(this.stateTable.tableArn);
    this.exportValue(this.projectConfigTable.tableArn);
  }
}
