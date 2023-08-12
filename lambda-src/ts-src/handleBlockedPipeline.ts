/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as util from 'util';
import {App} from '@slack/bolt';
import {ChatPostMessageArguments} from '@slack/web-api';
import {getDeployment, getDeploymentsWithDeployableId, getUserInfo} from './gitLabAPI';
import {PipelineEvent} from './gitLabTypes';
import {generateApprovalCardBlocks} from './generateApprovalCardBlocks';

export async function handleBlockedPipeline(pipelineEvent: PipelineEvent): Promise<void> {
  try {
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
        const chatPostMessageArguments = {
          channel: pipelineEvent.project.slack_channel_id,
          text: `Could not find a deployment for blocked pipeine in project ${pipelineEvent.project.name}.  Please use GitLab web UI to approve.`
        };
        await app.client.chat.postMessage(chatPostMessageArguments);
        return;
      } else if(deployments.length > 1) {
        console.error(`Found multiple blocked deployments for project ${pipelineEvent.project.name}`);
        const chatPostMessageArguments = {
          channel: pipelineEvent.project.slack_channel_id,
          text: `Found multiple blocked deployments for project ${pipelineEvent.project.name}.  Please use GitLab web UI to approve.`
        };
        await app.client.chat.postMessage(chatPostMessageArguments);
        return;
      }
      // Find the approvers from the deployment data
      const deployment = await getDeployment(gitLabBotToken, pipelineEvent.project.id, deployments[0].id);
      //TODO deal with different types of rules.
      const rules = deployment.approval_summary.rules;
      const approvers = await Promise.all(rules.map(async rule => {
        return await getUserInfo(gitLabBotToken, rule.user_id);
      }));

      // Create a nice looking card with some info about the project, pipeline and the approvers.
      // It also contains Approve and Reject buttons.
      // The buttons make Slack call back to the handleInteractiveEndpoint lambda.
      // That lambda then calls the APIs to approve the depoyment and restart the pipeline.
      const blocks = generateApprovalCardBlocks(pipelineEvent, deployment.id, pipelineEvent.builds[0].id, approvers);
      const chatPostMessageArguments: ChatPostMessageArguments = {
        channel: pipelineEvent.project.slack_channel_id,
        blocks
      };
      await app.client.chat.postMessage(chatPostMessageArguments);
    }
  }
  catch (error) {
    console.error(`Caught error: ${util.inspect(error)}`);
  }
}
