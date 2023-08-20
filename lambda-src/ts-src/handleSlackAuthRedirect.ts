import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import axios, {AxiosRequestConfig} from "axios";
import {getSecretValue} from "./awsAPI";

export async function handleSlackAuthRedirect(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    type QueryStringParameters = {
      code: string,
      state: string // TODO use this to prevent CSRF attacks
    };

    const slackClientId = await getSecretValue('GitBot', 'slackClientId');
    const slackClientSecret = await getSecretValue('GitBot', 'slackClientSecret');

    const queryStringParameters: QueryStringParameters = event.queryStringParameters as QueryStringParameters;
    if(!event.queryStringParameters) {
      throw new Error("Missing event queryStringParameters");
    }
    const code = queryStringParameters.code;

    const config: AxiosRequestConfig = {
      params: {
        code,
        client_id: slackClientId,
        client_secret: slackClientSecret
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

