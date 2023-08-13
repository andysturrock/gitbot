import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import axios, {AxiosRequestConfig} from 'axios';
import {UserData, putUserData} from './userDataTable';
import {deleteState, getState} from './stateTable';
import {getOIDCUserInfo} from './gitLabAPI';
import {postMarkdownAsBlocks} from './slackAPI';

export async function handleGitLabAuthRedirect(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    type QueryStringParameters = {
      code: string,
      state: string // This will contain the Slack user ID
    };
    const queryStringParameters: QueryStringParameters = event.queryStringParameters as QueryStringParameters;
    if(!event.queryStringParameters) {
      throw new Error("Missing event queryStringParameters");
    }
    const nonce = queryStringParameters.state;
    const state = await getState(nonce);
    if(!state) {
      throw new Error("Missing state.  Are you a cyber criminal trying a CSRF replay attack?");
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
    const gitbotUrl = process.env.GITBOT_URL;
    if(!gitbotUrl) {
      throw new Error("Missing env var GITBOT_URL");
    }
    const redirect_uri = `${gitbotUrl}/gitlab-oauth-redirect`;

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

    const {data} = await axios.post<PostResponse>(url, {}, config);

    // Get the GitLab user id for this user.  Could get this by decoding the token.
    // See https://docs.gitlab.com/ee/integration/openid_connect_provider.html
    const userInfo = await getOIDCUserInfo(data.access_token);

    const userData: UserData = {
      gitlab_user_id: userInfo.sub,
      slack_user_id: state.slack_user_id,
      gitlab_refresh_token: data.refresh_token
    };
    await putUserData(userData);

    // Tell the user via Slack the login worked...
    const successText = "You are now authenticated with GitLab.  You can now use other /gitbot slash commands.";
    await postMarkdownAsBlocks(state.response_url, successText);

    // And same again in the browser.
    const html = `
<!DOCTYPE html>
<html>
<body>

<h1>Authentication Success</h1>
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

