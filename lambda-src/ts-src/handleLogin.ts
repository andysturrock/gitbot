import * as util from 'util';
import crypto from 'crypto';
import {putState} from './stateTable';
import axios from 'axios';
import {SlashCommandPayload} from './slackTypes';

/**
 * Handle the login argument of the slash command.
 * @param slashCommandPayload the payload from the original slash command
 * @returns void but posts the login message to Slack in response to the slash command.
 */
async function lambdaHandler(slashCommandPayload: SlashCommandPayload): Promise<void> {
  try {
    console.log(`slashCommandPayload: ${util.inspect(slashCommandPayload)}`);
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
    
    // Using a nonce for the state mitigates CSRF attacks.
    const nonce = crypto.randomBytes(16).toString('hex');
    const state = {
      nonce,
      slack_user_id: slashCommandPayload.user_id
    };

    await putState(nonce, JSON.stringify(state));

    const url = `${authorizeUrl}?client_id=${clientId}&redirect_uri=${redirectUrl}&response_type=code&state=${nonce}&scope=${scopes}`;
    const blocks = {
      "blocks": [
        {
          type: "section",
          fields: [
            {
              type: "plain_text",
              text: "Sign in to GitLab"
            }
          ]
        },
        {
          type: "actions",
          block_id: "signInButton",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Sign in to GitLab"
              },
              url
            }
          ]
        }
      ]
    };

    const result = await axios.post(slashCommandPayload.response_url, blocks);
    if(result.status !== 200) {
      throw new Error(`Error ${util.inspect(result.statusText)} posting response: ${util.inspect(result.data)}`);
    }
  }
  catch (error) {
    console.error(`Caught error: ${util.inspect(error)}`);
  }
}

export {lambdaHandler};