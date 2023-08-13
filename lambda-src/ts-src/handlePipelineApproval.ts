import * as util from 'util';
import {InteractionPayload} from './slackTypes';
import {approveDeployment, playJob, rejectDeployment} from './gitLabAPI';
import {getUserDataBySlackUserId, putUserData} from './userDataTable';
import {refreshToken} from './refreshToken';
import {postMarkdownBlocks} from './slackAPI';

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
  try {
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
      await postMarkdownBlocks(payload.response_url, "Please log in (using `/gitbot login`) and then try again.");
      return;
    }

    if(actionValue.action == "approve") {
      await approveDeployment(accessToken, actionValue.project_id, actionValue.deployment_id);
      const playing = await playJob(accessToken, actionValue.project_id, actionValue.build_id);
      if(playing) {
        await postMarkdownBlocks(payload.response_url, "Approval succeeded, pipeline job now running.");
      }
      else {
        await postMarkdownBlocks(payload.response_url, "Approval succeeded but more still needed before pipeline job can run.");
      }
    }
    else 
    {
      await rejectDeployment(accessToken, actionValue.project_id, actionValue.deployment_id);
    }
  }
  catch (error) {
    // console.error(error);
    await postMarkdownBlocks(payload.response_url, "Failed to approve pipeline.  Please use GitLab web UI.");
  }
}
