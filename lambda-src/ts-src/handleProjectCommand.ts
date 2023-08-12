import * as util from 'util';
import {SlashCommandPayload} from './slackTypes';
import axios from 'axios';
import {getProjectDetails} from './gitLabAPI';
import {ProjectConfig, putProjectConfig} from './projectConfigTable';

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

  try {
    let projectId = -1;
    let text = `Usage: /gitbot project <id | name> connect`;
    if(slashCommandPayload.projectIdentifier) {
      projectId = parseInt(slashCommandPayload.projectIdentifier);
      if(Number.isNaN(projectId)) {
        const projectDetails = await getProjectDetails(gitLabBotToken, slashCommandPayload.projectIdentifier);
        if(projectDetails.length == 0) {
          text = `Can't find project with name "${slashCommandPayload.projectIdentifier}, please use project id instead`;
        }
        else if(projectDetails.length > 1) {
          text = `Can't find project with name "${slashCommandPayload.projectIdentifier}, please use project id instead`;
        }
        else {
          projectId = projectDetails[0].id;
          text = `Connecting project "${slashCommandPayload.projectIdentifier}" (id ${projectId})...`;
        }
      }
      else {
        text = `Connecting project id ${projectId}...`;
      }
    }

    const blocks = {
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text
          }
        }
      ]
    };
    const result = await axios.post(slashCommandPayload.response_url, blocks);
    if(result.status !== 200) {
      throw new Error(`Error ${util.inspect(result.statusText)} posting response: ${util.inspect(result.data)}`);
    }

    if(projectId != -1) {
      const projectConfig: ProjectConfig = {
        project_id: projectId,
        slack_channel_id: slashCommandPayload.channel_id
      };
      await putProjectConfig(projectId, projectConfig);
      // TODO create webhook here
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
