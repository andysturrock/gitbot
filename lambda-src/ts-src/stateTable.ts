
import {DynamoDBClient, PutItemCommand, PutItemCommandInput, QueryCommand, QueryCommandInput} from '@aws-sdk/client-dynamodb';

const TTL_IN_DAYS = 1;
const TableName = "State";

/**
 * Gets the state for the given nonce.
 * @param nonce 
 * @returns stringified state or undefined if no state exists for the nonce
 */
async function getState(nonce: string) { 
  const ddbClient = new DynamoDBClient({});

  const params: QueryCommandInput = {
    TableName,
    KeyConditionExpression: "nonce = :nonce",
    ExpressionAttributeValues: {
      ":nonce" : {"S" : nonce}
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

/**
 * Put (ie save new or overwite) state with nonce as the key
 * @param nonce Key for the table
 * @param state JSON value
 */
async function putState(nonce: string, state: string) {
  // The very useful TTL functionality in DynamoDB means we
  // can set a TTL on storing the refresh token.
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
      nonce: {S: nonce},
      state: {S: state},
      expiry: {N: `${Math.floor(ttl.getTime() / 1000)}`}
    }
  };

  const ddbClient = new DynamoDBClient({});

  await ddbClient.send(new PutItemCommand(putItemCommandInput));
}

export {getState, putState};