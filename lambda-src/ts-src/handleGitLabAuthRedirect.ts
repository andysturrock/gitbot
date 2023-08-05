import * as util from 'util';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import axios, {AxiosRequestConfig} from 'axios';
import {getToken, saveToken, updateToken} from './tokenStorage';

async function lambdaHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {

  try {
    type QueryStringParameters = {
      code: string,
      state: string // This will contain the Slack user ID
    };
    const queryStringParameters: QueryStringParameters = event.queryStringParameters as QueryStringParameters;
    if(!event.queryStringParameters) {
      throw new Error("Missing event queryStringParameters");
    }
    const slackUserId = queryStringParameters.state;
    
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

    await saveToken(slackUserId, data.refresh_token);

    const json = {
      msg: 'OK'
    };

    const result: APIGatewayProxyResult = {
      body: JSON.stringify(json),
      statusCode: 200
    };

    return result;
  }
  catch (error) {
    console.error(`Caught error: ${util.inspect(error)}`);

    const json = {
      error: JSON.stringify(util.inspect(error))
    };

    const result: APIGatewayProxyResult = {
      body: JSON.stringify(json),
      statusCode: 200
    };
    return result;
  }
}

export {lambdaHandler};