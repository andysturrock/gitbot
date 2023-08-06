import * as util from 'util';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import axios, {AxiosRequestConfig} from 'axios';
import {saveToken} from './tokenStorage';
import {deleteState, getState} from './stateTable';

async function lambdaHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {

  try {
    console.log(`event.queryStringParameters: ${util.inspect(event.queryStringParameters)}`);
    type QueryStringParameters = {
      code: string,
      state: string // This will contain the Slack user ID
    };
    const queryStringParameters: QueryStringParameters = event.queryStringParameters as QueryStringParameters;
    if(!event.queryStringParameters) {
      throw new Error("Missing event queryStringParameters");
    }
    const nonce = queryStringParameters.state;
    console.log(`queryStringParameters: ${util.inspect(queryStringParameters)}`);

    console.log(`Looking for state from nonce: ${nonce}`);
    const state = await getState(nonce);
    if(!state) {
      throw new Error("Missing state.  Are you a cyber criminal?");
    }
    await deleteState(nonce);
    
    const client_id = process.env.GITLAB_APPID;
    if(!client_id) {
      throw new Error("Missing env var GITLAB_APPID");
    }
    const client_secret = process.env.GITLAB_SECRET;
    if(!client_secret) {
      throw new Error("Missing env var GITLAB_SECRET");
    }
    const redirect_uri = process.env.GITLAB_CALLBACK_URL;
    if(!redirect_uri) {
      throw new Error("Missing env var GITLAB_CALLBACK_URL");
    }

    const config: AxiosRequestConfig = {
      params: {
        client_id,
        client_secret,
        code: queryStringParameters.code,
        grant_type: 'authorization_code',
        redirect_uri
      }
    };
    const url = 'https://gitlab.com/oauth/token';
    type PostResponse = {
      access_token: string,
      token_type: string,
      expires_in: number,
      refresh_token: string
      created_at: number
     };

    const {data, status} = await axios.post<PostResponse>(url, {}, config);
    if(status !== 200) {
      throw new Error(`Error ${status}`);
    }
    console.log(`status: ${util.inspect(status)}`);
    console.log(`data: ${util.inspect(data)}`);

    await saveToken(state.slack_user_id, data.refresh_token);

    const html = `
<!DOCTYPE html>
<html>
<body>

<h1>Authentication Success</h1>
<p>You are now authenticated with GitLab.  You can now use other /gitbot slash commands.</p>

</body>
</html>
    `;
    const result: APIGatewayProxyResult = {
      body: html,
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
      }
    };

    return result;
  }
  catch (error) {
    console.error(`Caught error: ${util.inspect(error)}`);

    const html = `
<!DOCTYPE html>
<html>
<body>

<h1>Authentication Failure</h1>
<p>There was an error:</p>
<p>${JSON.stringify(util.inspect(error))}</p>

</body>
</html>
    `;

    const result: APIGatewayProxyResult = {
      body: html,
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
      }
    };
    return result;
  }
}

export {lambdaHandler};