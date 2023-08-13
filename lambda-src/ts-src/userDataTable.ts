
import {DynamoDBClient, PutItemCommand, PutItemCommandInput, QueryCommand, QueryCommandInput, ScanCommand, ScanCommandInput} from '@aws-sdk/client-dynamodb';

// The very useful TTL functionality in DynamoDB means we
// can set a TTL on storing the refresh token.
// DynamoDB will automatically delete the token in
// ${TTL_IN_DAYS} days from now, so then the user will have to re-authenticate.
// This is good security and also keeps down storage costs.
// If the user has accessed any functionality then the token and the TTL will
// be refreshed so the 7 days is really 7 days after last usage.
const TTL_IN_MS = 1000 * 60 * 60 * 24 * 7;  // 7 days
const TableName = "UserData";

export type UserData = {
  gitlab_user_id: number,
  slack_user_id: string,
  gitlab_refresh_token: string
};

export async function getUserDataByGitLabUserId(gitLabUserId: number) { 
  const ddbClient = new DynamoDBClient({});

  const params: QueryCommandInput = {
    TableName,
    KeyConditionExpression: "gitlab_user_id = :gitlab_user_id",
    ExpressionAttributeValues: {
      ":gitlab_user_id" : {"N" : gitLabUserId.toString()}
    }
  };
  const data = await ddbClient.send(new QueryCommand(params));
  const items = data.Items;
  if(items && items[0] && items[0].slack_id.S && items[0].gitlab_refresh_token.S) {
    const userData: UserData = {
      gitlab_user_id: gitLabUserId,
      slack_user_id: items[0].slack_id.S,
      gitlab_refresh_token: items[0].gitlab_refresh_token.S
    };
    return userData;
  }
  else {
    return undefined;
  }
}

export async function getUserDataBySlackUserId(slackUserId: string) { 
  const ddbClient = new DynamoDBClient({});

  const params: QueryCommandInput = {
    TableName,
    KeyConditionExpression: "slack_user_id = :slack_user_id",
    ExpressionAttributeValues: {
      ":slack_user_id" : {"S" : slackUserId}
    }
  };
  const data = await ddbClient.send(new QueryCommand(params));
  const items = data.Items;
  if(items && items[0] && items[0].gitlab_user_id.N && items[0].gitlab_refresh_token.S) {
    const userData: UserData = {
      gitlab_user_id: parseInt(items[0].gitlab_user_id.N),
      slack_user_id: slackUserId,
      gitlab_refresh_token: items[0].gitlab_refresh_token.S
    };
    return userData;
  }
  else {
    return undefined;
  }
}

/**
 * Put (ie add new or overwrite) userData
 * @param userData the data to put
 */
export async function putUserData(userData: UserData) {
  const now = Date.now();
  const ttl = new Date(now + TTL_IN_MS);

  const putItemCommandInput: PutItemCommandInput = {
    TableName,
    Item: {
      slack_user_id: {S: userData.slack_user_id},
      gitlab_user_id: {N: userData.gitlab_user_id.toString()}, // numbers are actually stored as strings
      gitlab_refresh_token: {S: userData.gitlab_refresh_token},
      expiry: {N: `${Math.floor(ttl.getTime() / 1000)}`}
    }
  };

  const ddbClient = new DynamoDBClient({});

  await ddbClient.send(new PutItemCommand(putItemCommandInput));
}

export async function getUserData() { 
  const ddbClient = new DynamoDBClient({});

  const params: ScanCommandInput = {
    TableName
  };
  const data = await ddbClient.send(new ScanCommand(params));
  
  const userData: UserData[] = [];
  data.Items?.forEach(item => {
    if(item.slack_user_id.S && item.gitlab_user_id.N && item.gitlab_refresh_token.S) {
      userData.push({
        gitlab_user_id: parseInt(item.gitlab_user_id.N),
        slack_user_id: item.slack_user_id.S,
        gitlab_refresh_token: item.gitlab_refresh_token.S
      });
    }
  });

  return userData;
}