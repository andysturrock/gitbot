import {InteractionPayload} from './slackTypes';
import {approveDeployment, playJob, rejectDeployment} from './gitLabAPI';
import {getUserDataBySlackUserId, putUserData} from './userDataTable';
import {refreshToken} from './refreshToken';
import {postMarkdownAsBlocks, postMarkdownAsBlocksToUrl} from './slackAPI';
import {App} from '@slack/bolt';

async function getGitLabAccessToken(slackUserId: string) {
  const userData = await getUserDataBySlackUserId(slackUserId);

  if(userData) {
    // TODO check expiry time and reuse the existing access token
    // if it hasn't expired yet.
    const tokenResponse = await refreshToken(userData.gitlab_refresh_token);
    userData.gitlab_refresh_token = tokenResponse.refresh_token;
    await putUserData(userData);
    return tokenResponse.access_token;
  }
}
/**
 * Handle the rejection or approval and restart of the pipeline.
 * @param payload the original interaction payload from Slack
 * @returns void
 */
export async function handlePipelineApproval(payload: InteractionPayload): Promise<void> {
  const slackBotToken = process.env.SLACK_BOT_TOKEN;
  if(!slackBotToken) {
    throw new Error("Missing env var SLACK_BOT_TOKEN");
  }
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if(!signingSecret) {
    throw new Error("Missing env var SLACK_SIGNING_SECRET");
  }
  const gitLabBotToken = process.env.GITLAB_BOT_TOKEN;
  if(!gitLabBotToken) {
    throw new Error("Missing env var GITLAB_BOT_TOKEN");
  }

  try {
    // We can't reply to the response_url here because it will always replace the original message.
    // So have to use the SDK to post messages to the channel directly.
    const app = new App({
      token: slackBotToken,
      signingSecret
    });

    type ActionValue = {
      action: "approve" | "reject",
      project_id: number,
      deployment_id: number,
      build_id: number
    };
    // TODO assume we only get one Action for now
    const actionValue = JSON.parse(payload.actions[0].value) as ActionValue;
    
    const accessToken = await getGitLabAccessToken(payload.user.id);
    if(!accessToken) {
      // Ephemeral, not replacing original approval card
      await postMarkdownAsBlocks(app, payload.channel.id, "Please log in (using `/gitbot login`) and then try again.", "Login required", payload.user.id);
      return;
    }

    if(actionValue.action == "approve") {
      await approveDeployment(accessToken, actionValue.project_id, actionValue.deployment_id);
      // Play the pipeline as the bot.  The users may have permissions to approve, but not to play.
      const playing = await playJob(gitLabBotToken, actionValue.project_id, actionValue.build_id);
      if(playing) {
        // Fine to replace original
        await postMarkdownAsBlocksToUrl(payload.response_url, "Approval succeeded, pipeline job now running.", "Pipeline job approved", true);
      }
      else {
        // Ephemeral, not replacing original approval card
        await postMarkdownAsBlocks(app, payload.channel.id, `<@${payload.user.id}> approved but more approvals required before pipeline job can run.`,
          "Pipeline job partially approved", payload.user.id);
      }
    }
    else 
    {
      await rejectDeployment(accessToken, actionValue.project_id, actionValue.deployment_id);
      // Fine to replace original
      await postMarkdownAsBlocksToUrl(payload.response_url, "Pipeline rejected", "Pipeline rejected", true);
    }
  }
  catch (error) {
    console.error(error);
    // Fine to replace original
    await postMarkdownAsBlocksToUrl(payload.response_url, "Failed to approve pipeline.  Please use GitLab web UI.", "Error approving pipeline job");
  }
}
