import axios from 'axios';
import {SlashCommandPayload} from './slackTypes';
import {DividerBlock, KnownBlock, SectionBlock} from '@slack/bolt';
import {getUserData} from './userDataTable';
import {getProjectDetailsById, getUserInfo} from './gitLabAPI';
import {getAllProjectConfig} from './projectConfigTable';

/**
 * Handle the status argument of the slash command.
 * @param slashCommandPayload the payload from the original slash command
 * @returns void but posts the status message to Slack in response to the slash command.
 */
export async function handleStatusCommand(slashCommandPayload: SlashCommandPayload): Promise<void> {
  try {
    const gitLabBotToken = process.env.GITLAB_BOT_TOKEN;
    if(!gitLabBotToken) {
      throw new Error("Missing env var GITLAB_BOT_TOKEN");
    }
   
    const blocks: KnownBlock[] = [];
    const dividerBlock: DividerBlock = {
      type: "divider"
    };
    blocks.push(dividerBlock);

    let section: SectionBlock = {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Gitbot status`
      }
    };
    blocks.push(section);
    blocks.push(dividerBlock);

    section = {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Logged in users:`
      }
    };
    blocks.push(section);

    for(const userData of await getUserData()) {
      const userInfo = await getUserInfo(gitLabBotToken, userData.gitlab_user_id);
      const section: SectionBlock = {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<@${userData.slack_user_id}> logged in as GitLab user <${userInfo.web_url}|${userInfo.name}>`
        },
        accessory: {
          type: "image",
          image_url: userInfo.avatar_url,
          alt_text: userInfo.name
        }
      };
      blocks.push(section);
    }

    blocks.push(dividerBlock);
    section = {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Connected projects:`
      }
    };
    blocks.push(section);

    for(const projectConfig of await getAllProjectConfig()) {
      const projectDetails = await getProjectDetailsById(gitLabBotToken, projectConfig.project_id);
      const section: SectionBlock = {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<${projectDetails.web_url}|${projectDetails.name}> is in channel <#${projectConfig.slack_channel_id}>`
        }
      };
      blocks.push(section);
    }

    blocks.push(dividerBlock);

    const message = {
      text: "Gitbot status",
      blocks,
      replace_original: true
    };

    await axios.post(slashCommandPayload.response_url, message);
  }
  catch (error) {
    console.error(error);
  }
}
