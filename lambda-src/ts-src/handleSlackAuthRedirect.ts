import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import axios, {AxiosRequestConfig} from "axios";
import util from 'util';

export async function handleSlackAuthRedirect(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.log(`handleSlackAuthRedirect got ${util.inspect(event)}`);
    type QueryStringParameters = {
      code: string,
      state: string // TODO use this to prevent CSRF attacks
    };

    const client_id = process.env.SLACK_CLIENT_ID;
    if(!client_id) {
      throw new Error("Missing env var SLACK_CLIENT_ID");
    }
    const client_secret = process.env.SLACK_CLIENT_SECRET;
    if(!client_secret) {
      throw new Error("Missing env var SLACK_CLIENT_SECRET");
    }

    const queryStringParameters: QueryStringParameters = event.queryStringParameters as QueryStringParameters;
    if(!event.queryStringParameters) {
      throw new Error("Missing event queryStringParameters");
    }
    const code = queryStringParameters.code;

    const config: AxiosRequestConfig = {
      params: {
        code,
        client_id,
        client_secret
      },
      headers: { 
        "Content-Type": "application/x-www-form-urlencoded"
      }
    };
    const url = "https://slack.com/api/oauth.v2.access";

    type SlackResponse = {
      ok: boolean,
      app_id: string,
      authed_user: { id: string },
      scope: string,
      token_type: string,
      access_token: string,
      bot_user_id: string,
      team: { id: string, name: string },
      enterprise: { id: string, name: string },
      is_enterprise_install: boolean
    };
    const {data} = await axios.post<SlackResponse>(url, {}, config);
    console.log(`response.data: ${util.inspect(data)}`);
   
    const successText = `Successfully installed gitbot in workspace ${data.team.name}`;
    const html = `
<!DOCTYPE html>
<html>
<body>

<h1>Installation Success</h1>
<p>${successText}</p>

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
    console.error(error);
    const html = `
<!DOCTYPE html>
<html>
<body>

<h1>Authentication Failure</h1>
<p>There was an error.  Please check the logs.</p>

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

