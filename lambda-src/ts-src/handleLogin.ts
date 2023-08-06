import * as util from 'util';
import crypto from 'crypto';
import {APIGatewayProxyEvent} from "aws-lambda";
import {putState} from './stateTable';
import axios from 'axios';

/**
 * Handle the login argument of the slash command.
 * @param event 
 * @returns nothing but posts the login message to Slack in response to the slash command.
 */
async function lambdaHandler(event: APIGatewayProxyEvent): Promise<void> {
  try {
    console.log(`event: ${util.inspect(event)}`);
    const authorizeUrl = process.env.GITLAB_AUTHORIZE_URL;
    if(!authorizeUrl) {
      throw new Error("Missing env var GITLAB_AUTHORIZE_URL");
    }
    const clientId = process.env.GITLAB_APPID;
    if(!clientId) {
      throw new Error("Missing env var GITLAB_APPID");
    }
    let redirectUrl = process.env.GITLAB_CALLBACK_URL;
    if(!redirectUrl) {
      throw new Error("Missing env var GITLAB_CALLBACK_URL");
    }
    redirectUrl = encodeURIComponent(redirectUrl);
    const scopes = process.env.GITLAB_SCOPES;
    if(!scopes) {
      throw new Error("Missing env var GITLAB_SCOPES");
    }

    type Body = {
      token: string,
      team_id: string,
      team_domain: string,
      channel_id: string,
      channel_name: string,
      user_id: string,
      user_name: string,
      command: string,
      text: string,
      api_app_id: string,
      is_enterprise_install: string,
      response_url: string,
      trigger_id:string
    };
    const body = event as unknown as Body;
    
    const nonce = crypto.randomBytes(16).toString('base64');

    console.log(`nonce: ${util.inspect(nonce)}`);

    const state = {
      nonce,
      slack_user_id: body.user_id
    };

    await putState(nonce, JSON.stringify(state));

    const url = `${authorizeUrl}?client_id=${clientId}&redirect_uri=${redirectUrl}&response_type=code&state=${nonce}&scope=${scopes}`;
    const blocks = {
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Please sign in to GitLab at ${url}`
          }
        },
      ]
    };
    const result = await axios.post(body.response_url, blocks);
    if(result.status !== 200) {
      throw new Error(`Error ${util.inspect(result.statusText)} posting response: ${util.inspect(result.data)}`);
    }
  }
  catch (error) {
    console.error(`Caught error: ${util.inspect(error)}`);
  }
}

export {lambdaHandler};