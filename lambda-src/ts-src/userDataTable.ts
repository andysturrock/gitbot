
import {DynamoDBClient, PutItemCommand, PutItemCommandInput, QueryCommand, QueryCommandInput} from '@aws-sdk/client-dynamodb';

// The very useful TTL functionality in DynamoDB means we
// can set a TTL on storing the refresh token.
// DynamoDB will automatically delete the token in
// ${TTL_IN_DAYS} days from now, so then the user will have to re-authenticate.
// This is good security and also keeps down storage costs.
// If the user has accessed any functionality then the token and the TTL will
// be refreshed so the 7 days is really 7 days after last usage.
const TTL_IN_MS = 1000 * 60 * 60 * 24 * 7;  // 7 days
const TableName = "UserData";

export async function getSlackUserId(gitLabUserId: string) { 
  const ddbClient = new DynamoDBClient({});

  const params: QueryCommandInput = {
    TableName,
    KeyConditionExpression: "gitlab_id = :gitlab_id",
    ExpressionAttributeValues: {
      ":gitlab_id" : {"S" : gitLabUserId}
    }
  };
  const data = await ddbClient.send(new QueryCommand(params));
  const items = data.Items;
  if(items && items[0] && items[0].slack_id.S) {
    return items[0].slack_id.S;
  }
  else {
    return undefined;
  }
}

export async function getTokenForGitLabUser(gitLabUserId: string) { 
  const ddbClient = new DynamoDBClient({});

  const params: QueryCommandInput = {
    TableName,
    KeyConditionExpression: "gitlab_id = :gitlab_id",
    ExpressionAttributeValues: {
      ":gitlab_id" : {"S" : gitLabUserId}
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

export async function getGitLabTokenForSlackUser(slackUserId: string) { 
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

export async function getGitLabUserId(slackUserId: string) { 
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
  if(items && items[0] && items[0].gitlab_id.N) {
    return parseInt(items[0].gitlab_id.N);
  }
  else {
    return undefined;
  }
}

export async function saveToken(slackUserId: string, gitlabUserId: number, refreshToken: string) {
  const now = Date.now();
  const ttl = new Date(now + TTL_IN_MS);

  const putItemCommandInput: PutItemCommandInput = {
    TableName,
    Item: {
      slack_id: {S: slackUserId},
      gitlab_id: {N: gitlabUserId.toString()}, // numbers are actually stored as strings
      gitlab_token: {S: refreshToken},
      expiry: {N: `${Math.floor(ttl.getTime() / 1000)}`}
    }
  };

  const ddbClient = new DynamoDBClient({});

  await ddbClient.send(new PutItemCommand(putItemCommandInput));
}
