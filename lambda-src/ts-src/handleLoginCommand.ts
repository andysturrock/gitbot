import * as util from 'util';
import crypto from 'crypto';
import {State, putState} from './stateTable';
import axios from 'axios';
import {SlashCommandPayload} from './slackTypes';
import {getSecretValue} from './awsAPI';

/**
 * Handle the login argument of the slash command.
 * @param slashCommandPayload the payload from the original slash command
 * @returns void but posts the login message to Slack in response to the slash command.
 */
export async function handleLoginCommand(slashCommandPayload: SlashCommandPayload): Promise<void> {
  try {
    const gitLabAuthorizeUrl = await getSecretValue('GitBot', 'gitLabAuthorizeUrl');
    const gitLabAppId = await getSecretValue('GitBot', 'gitLabAppId');
    const gitBotUrl = await getSecretValue('GitBot', 'gitBotUrl');
    const redirect_uri = encodeURIComponent(`${gitBotUrl}/gitlab-oauth-redirect`);
    const gitLabScopes = await getSecretValue('GitBot', 'gitLabScopes');
    
    // Using a nonce for the state mitigates CSRF attacks.
    const nonce = crypto.randomBytes(16).toString('hex');
    const state: State = {
      nonce,
      slack_user_id: slashCommandPayload.user_id,
      response_url: slashCommandPayload.response_url
    };

    await putState(nonce, JSON.stringify(state));

    const url = `${gitLabAuthorizeUrl}?client_id=${gitLabAppId}&redirect_uri=${redirect_uri}&response_type=code&state=${nonce}&scope=${gitLabScopes}`;
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
