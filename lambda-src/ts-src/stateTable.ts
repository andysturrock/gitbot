
import {DynamoDBClient, PutItemCommand, PutItemCommandInput, QueryCommand, QueryCommandInput, DeleteItemCommand, DeleteItemCommandInput} from '@aws-sdk/client-dynamodb';
import util from 'util';

// The very useful TTL functionality in DynamoDB means we
// can set a TTL on storing the refresh token.
// This is good security and also keeps down storage costs.
// This state should be fairly short-lived as it's just to
// mitigage CSRF attacks on the login redirect.
const TTL_IN_MS = 1000 * 30; // 30 seconds
const TableName = "State";

type State = {
  nonce: string,
  slack_user_id: string
};

/**
 * Gets the state for the given nonce.
 * @param nonce 
 * @returns state or undefined if no state exists for the nonce
 */
async function getState(nonce: string) : Promise<State | undefined>  { 
  const ddbClient = new DynamoDBClient({});

  console.log(`getState Looking for ${nonce}`);

  const params: QueryCommandInput = {
    TableName,
    KeyConditionExpression: "nonce = :nonce",
    ExpressionAttributeValues: {
      ":nonce" : {"S" : nonce}
    }
  };
  const data = await ddbClient.send(new QueryCommand(params));
  console.log(`getState data: ${util.inspect(data)}`);
  const items = data.Items;
  if(items && items[0] && items[0].state.S) {
    console.log(`getState Found ${items[0].state.S}`);
    console.log(`getState Found ${util.inspect(items[0].state.S)}`);
    const state = JSON.parse(items[0].state.S) as State;
    console.log(`getState state: ${util.inspect(state)}`);
    return state;
  }
  else {
    return undefined;
  }
}

async function deleteState(nonce: string) {
  const ddbClient = new DynamoDBClient({});

  const params: DeleteItemCommandInput = {
    TableName,
    Key: {
      'nonce': {S: nonce}
    }
  };

  const command = new DeleteItemCommand(params);

  await ddbClient.send(command);
}

/**
 * Put (ie save new or overwite) state with nonce as the key
 * @param nonce Key for the table
 * @param state JSON value
 */
async function putState(nonce: string, state: string) {
  const now = Date.now();
  const ttl = new Date(now + TTL_IN_MS);

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

export {getState, putState, deleteState, State};