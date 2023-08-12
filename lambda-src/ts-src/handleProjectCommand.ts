import * as util from 'util';
import {SlashCommandPayload} from './slackTypes';
import axios from 'axios';
import {createProjectHook, editProjectHook, getProjectDetailsById, getProjectDetailsByName, listProjectHooks} from './gitLabAPI';
import {ProjectConfig, putProjectConfig} from './projectConfigTable';
import {ProjectDetails, ProjectHookDetails} from './gitLabTypes';
import {postMarkdownBlocks} from './slackAPI';

/**
 * Handle the project argument of the slash command.
 * @param slashCommandPayload the payload from the original slash command
 * @returns void but posts the login message to Slack in response to the slash command.
 */
export async function handleProjectCommand(slashCommandPayload: SlashCommandPayload): Promise<void> {
  const gitLabBotToken = process.env.GITLAB_BOT_TOKEN;
  if(!gitLabBotToken) {
    throw new Error("Missing env var GITLAB_BOT_TOKEN");
  }
  const customDomainName = process.env.CUSTOM_DOMAIN_NAME;
  if(!customDomainName) {
    throw new Error("Missing env var CUSTOM_DOMAIN_NAME");
  }
  const lambdaVersion = process.env.LAMBDA_VERSION;
  if(!lambdaVersion) {
    throw new Error("Missing env var LAMBDA_VERSION");
  }
  const lambdaVersionIdForURL = lambdaVersion.replace(/\./g, '_');

  try {   
    let projectDetails: ProjectDetails[];
    if(slashCommandPayload.projectIdentifier) {
      const projectId = parseInt(slashCommandPayload.projectIdentifier);
      if(Number.isNaN(projectId)) {
        projectDetails = await getProjectDetailsByName(gitLabBotToken, slashCommandPayload.projectIdentifier);
        if(projectDetails.length == 0) {
          const text = `Can't find project with name "${slashCommandPayload.projectIdentifier}, please use project id instead`;
          await postMarkdownBlocks(slashCommandPayload.response_url, text);
          return;
        }
        else if(projectDetails.length > 1) {
          const text = `Found more than one project with name "${slashCommandPayload.projectIdentifier}, please use project id instead`;
          await postMarkdownBlocks(slashCommandPayload.response_url, text);
          return;
        }
      }
      else {
        projectDetails = [await getProjectDetailsById(gitLabBotToken, projectId)];
      }
      const text = `Connecting project <${projectDetails[0].web_url}|${projectDetails[0].name}>...`;
      await postMarkdownBlocks(slashCommandPayload.response_url, text);

      const existingHooks = await listProjectHooks(gitLabBotToken, projectId);
      // Find any hooks that we have already created.
      const ourUrl = `https://gitbot.${customDomainName}/${lambdaVersionIdForURL}/projecthook-event`;
      const ourHooks = existingHooks.filter(hook => {
        return hook.url === ourUrl;
      });
      // Enable pipeline events for any existing hooks
      for(const hook of ourHooks) {
        hook.pipeline_events = true;
        await editProjectHook(gitLabBotToken, projectId, hook.id, hook);
      }
      // If there aren't any of our hooks then create a new one.
      if(ourHooks.length == 0) {
        const hook: ProjectHookDetails = {
          id: projectId,
          hook_id: 0, // not used in PUT
          project_id: projectId, // not used in PUT
          url: ourUrl,
          pipeline_events: true,
          push_events: false,
        };
        await createProjectHook(gitLabBotToken, projectId, hook);
      }

      // Save the mapping between the project and the Slack channel id.
      const projectConfig: ProjectConfig = {
        project_id: projectId,
        slack_channel_id: slashCommandPayload.channel_id
      };
      await putProjectConfig(projectId, projectConfig);

      const blocks = {
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Project <${projectDetails[0].web_url}|${projectDetails[0].name}> successfully connected for blocked pipeline events.`
            }
          }
        ]
      };
      const result = await axios.post(slashCommandPayload.response_url, blocks);
      if(result.status !== 200) {
        throw new Error(`Error ${util.inspect(result.statusText)} posting response: ${util.inspect(result.data)}`);
      }  
    }
    else {
      console.error("Logic error");
    }
  }
  catch (error) {
    console.error(`Caught error: ${util.inspect(error)}`);
    const blocks = {
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Error - check logs"
          }
        }
      ]
    };
    await axios.post(slashCommandPayload.response_url, blocks);
  }
}
