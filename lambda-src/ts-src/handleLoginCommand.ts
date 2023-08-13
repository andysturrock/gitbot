import * as util from 'util';
import crypto from 'crypto';
import {State, putState} from './stateTable';
import axios from 'axios';
import {SlashCommandPayload} from './slackTypes';

/**
 * Handle the login argument of the slash command.
 * @param slashCommandPayload the payload from the original slash command
 * @returns void but posts the login message to Slack in response to the slash command.
 */
export async function handleLoginCommand(slashCommandPayload: SlashCommandPayload): Promise<void> {
  try {
    const authorizeUrl = process.env.GITLAB_AUTHORIZE_URL;
    if(!authorizeUrl) {
      throw new Error("Missing env var GITLAB_AUTHORIZE_URL");
    }
    const clientId = process.env.GITLAB_APPID;
    if(!clientId) {
      throw new Error("Missing env var GITLAB_APPID");
    }
    const gitbotUrl = process.env.GITBOT_URL;
    if(!gitbotUrl) {
      throw new Error("Missing env var GITBOT_URL");
    }
    const redirect_uri = encodeURIComponent(`${gitbotUrl}/gitlab-oauth-redirect`);
    const scopes = process.env.GITLAB_SCOPES;
    if(!scopes) {
      throw new Error("Missing env var GITLAB_SCOPES");
    }
    
    // Using a nonce for the state mitigates CSRF attacks.
    const nonce = crypto.randomBytes(16).toString('hex');
    const state: State = {
      nonce,
      slack_user_id: slashCommandPayload.user_id,
      response_url: slashCommandPayload.response_url
    };

    await putState(nonce, JSON.stringify(state));

    const url = `${authorizeUrl}?client_id=${clientId}&redirect_uri=${redirect_uri}&response_type=code&state=${nonce}&scope=${scopes}`;
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
              url,
              style: "primary",
              action_id: 'gitLabSignInButton'
            }
          ]
        }
      ]
    };

    await axios.post(slashCommandPayload.response_url, blocks);
  }
  catch (error) {
    console.error(`Caught error: ${util.inspect(error)}`);
  }
}
