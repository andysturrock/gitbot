import * as util from 'util';
import {InteractionPayload} from './slackTypes';
import {approveDeployment, playJob, rejectDeployment} from './gitLabAPI';
import {getGitLabTokenForSlackUser, getGitLabUserId, saveToken} from './userDataTable';
import {refreshToken} from './refreshToken';

async function getNewAccessToken(slackUserId: string) {
  const oldRefreshToken = await getGitLabTokenForSlackUser(slackUserId);
  // TODO could get this in one query
  const gitlabUserId = await getGitLabUserId(slackUserId);
  // TODO send an error message saying to log in if we don't find the user info
  if(oldRefreshToken && gitlabUserId) {
    const tokenResponse = await refreshToken(oldRefreshToken);
    await saveToken(slackUserId, gitlabUserId, tokenResponse.refresh_token);
    return tokenResponse.access_token;
  }
  else {
    throw new Error(`Failed to get GitLab access token for Slack user ${slackUserId}`);
    
  }
}
/**
 * Handle the rejection or approval and restart of the pipeline.
 * @param payload the original interaction payload from Slack
 * @returns void but posts the login message to Slack in response to the slash command.
 */
async function lambdaHandler(payload: InteractionPayload): Promise<void> {
  try {
    console.log(`payload: ${util.inspect(payload)}`);

    type ActionValue = {
      action: "approve" | "reject",
      project_id: number,
      deployment_id: number,
      build_id: number
    };
    // TODO assume we only get one Action for now
    const actionValue = JSON.parse(payload.actions[0].value) as ActionValue;
    console.log(`actions: ${util.inspect(actionValue)}`);
    
    const accessToken = await getNewAccessToken(payload.user.id);
    if(actionValue.action == "approve") {
      await approveDeployment(accessToken, actionValue.project_id, actionValue.deployment_id);
      await playJob(accessToken, actionValue.project_id, actionValue.build_id);
    }
    else 
    {
      await rejectDeployment(accessToken, actionValue.project_id, actionValue.deployment_id);
    }
  }
  catch (error) {
    console.error(`Caught error: ${util.inspect(error)}`);
  }
}

export {lambdaHandler};