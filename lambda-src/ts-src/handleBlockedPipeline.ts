/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as util from 'util';
import {App} from '@slack/bolt';
import {ChatPostMessageArguments} from '@slack/web-api';
import {getDeployment, getDeploymentsWithDeployableId, getGroupInfo, getUserInfo} from './gitLabAPI';
import {GroupInfo, PipelineEvent, UserInfo} from './gitLabTypes';
import {generateApprovalCardBlocks} from './generateApprovalCardBlocks';
import {postMarkdownAsBlocks} from './slackAPI';
import {getSecretValue} from './awsAPI';

export async function handleBlockedPipeline(pipelineEvent: PipelineEvent): Promise<void> {
  try {
    const slackBotToken = await getSecretValue('GitBot', 'slackBotToken');
    const signingSecret = await getSecretValue('GitBot', 'slackSigningSecret');
    const gitLabBotToken = await getSecretValue('GitBot', 'gitLabBotToken');

    // Builds are listed in reverse order (ie latest stage first) in the JSON.
    // TODO shouldn't rely on ordering as the JSON spec says it's an unordered set of key/value pairs.
    // So we should iterate over all the builds to find one where the stage is deploy and the status is manual.
    const stage = pipelineEvent.builds[0].stage;
    const status = pipelineEvent.builds[0].status;
    if(stage.match(/^deploy/) && status === "manual") {
      const buildId = pipelineEvent.builds[0].id;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const app = new App({
        token: slackBotToken,
        signingSecret
      });

      const deployments = await getDeploymentsWithDeployableId(gitLabBotToken, pipelineEvent.project.id, buildId);

      // Send error message to Slack if we don't get exactly one result.
      if(deployments.length == 0) {
        console.error(`Could not find a deployment with deployable id ${buildId}`);
        await postMarkdownAsBlocks(app, pipelineEvent.project.slack_channel_id,
          `Could not find a deployment for blocked pipeine in project ${pipelineEvent.project.name}.  Please use GitLab web UI to approve.`,
          "Error finding deployment for blocked pipeline");
        return;
      } else if(deployments.length > 1) {
        console.error(`Found multiple blocked deployments for project ${pipelineEvent.project.name}`);
        await postMarkdownAsBlocks(app, pipelineEvent.project.slack_channel_id,
          `Found multiple blocked deployments for project ${pipelineEvent.project.name}.  Please use GitLab web UI to approve.`,
          "Found multiple deployments for blocked pipeline");
        return;
      }
      // Find the approvers from the deployment data
      const deployment = await getDeployment(gitLabBotToken, pipelineEvent.project.id, deployments[0].id);    
      const rules = deployment.approval_summary.rules;
      const userApprovers: UserInfo[] = [];
      const groupApprovers: GroupInfo[] = [];
      await Promise.all(rules.map(async rule => {
        if(rule.user_id) {
          userApprovers.push(await getUserInfo(gitLabBotToken, rule.user_id));
        } else if(rule.group_id) {
          groupApprovers.push(await getGroupInfo(gitLabBotToken, rule.group_id));
        }
      }));

      // Create a nice looking card with some info about the project, pipeline and the approvers.
      // It also contains Approve and Reject buttons.
      // The buttons make Slack call back to the handleInteractiveEndpoint lambda.
      // That lambda then calls the APIs to approve the depoyment and restart the pipeline.
      const blocks = generateApprovalCardBlocks(pipelineEvent, deployment.id, pipelineEvent.builds[0].id, userApprovers, groupApprovers, deployment.approval_summary);
      const chatPostMessageArguments: ChatPostMessageArguments = {
        channel: pipelineEvent.project.slack_channel_id,
        blocks,
        text: "Pipeline approval required"
      };
      await app.client.chat.postMessage(chatPostMessageArguments);
    }
  }
  catch (error) {
    console.error(`Caught error: ${util.inspect(error)}`);
  }
}
