
import {DynamoDBClient, UpdateItemCommand, PutItemCommand, PutItemCommandInput, QueryCommand, QueryCommandInput, UpdateItemCommandInput} from '@aws-sdk/client-dynamodb';

const TTL_IN_DAYS = 7;
const TableName = "SlackIdToGitLabToken";

async function getToken(slackUserId: string) { 
  const ddbClient = new DynamoDBClient({});

  const params: QueryCommandInput = {
    TableName,
    KeyConditionExpression: "slack_id = :slack_id",
    ExpressionAttributeValues: {
      ":slack_id" : {"S" : slackUserId}
    }
  };
  const data = await ddbClient.send(new QueryCommand(params));
  const items = data.Items;
  if(items && items[0] && items[0].gitlab_token.S) {
    return items[0].gitlab_token.S;
  }
  else {
    return undefined;
  }
}

async function saveToken(slackUserId: string, refreshToken: string) {
  // The very useful TTL functionality in DynamoDB means we
  // can set a 7 day TTL on storing the refresh token.
  // DynamoDB will automatically delete the token in
  // ${TTL_IN_DAYS} days from now, so then the user will have to re-authenticate.
  // This is good security and also keeps down storage costs.
  // If the user has accessed any functionality then the token and the TTL will
  // be refreshed so the 7 days is really 7 days after last usage.
  const ttl = new Date(Date.now());
  ttl.setDate(ttl.getDate() + TTL_IN_DAYS);

  const putItemCommandInput: PutItemCommandInput = {
    TableName,
    Item: {
      slack_id: {S: slackUserId},
      gitlab_token: {S: refreshToken},
      expiry: {N: `${Math.floor(ttl.getTime() / 1000)}`}
    }
  };

  const ddbClient = new DynamoDBClient({});

  await ddbClient.send(new PutItemCommand(putItemCommandInput));
}
export {getToken, saveToken};