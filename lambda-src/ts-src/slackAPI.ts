import axios from "axios";
import {App} from '@slack/bolt';
import {ChatPostMessageArguments, ChatPostEphemeralArguments} from '@slack/web-api';

type Message = {
  replace_original?: string,
  response_type?: string,
  blocks: Block[],
  text: string
};
type Block = {
  type: "section",
  text: {
    type: "mrkdwn",
    text: string
  }
};

/**
 * Post a message to a Slack webhook
 * @param url 
 * @param markdown Text formatted as Slack markdown
 * @param text Alternate text used in the notification.  Use plain text.
 * @param replaceOriginal 
 * @param inChannel 
 */
export async function postMarkdownAsBlocksToUrl(url: string, markdown: string, text: string, replaceOriginal: boolean = false, inChannel: boolean = false) {
  const blocks = createBlocks(markdown);
  const message: Message = {
    blocks,
    text
  };
  // Seems to require explicit setting otherwise will always replace the original
  message.replace_original = replaceOriginal ? "true" : "false";
  if(inChannel) {
    message.response_type = "in_channel";
  }
  await axios.post(url, message);
}

/**
 * Posts a chat message
 * @param app Initialised app object
 * @param channelId Channel to post the message
 * @param markdown Text formatted as Slack markdown
 * @param text Alternate text used in the notification.  Use plain text.
 * @param userId set to send an ephemeral message just to this user
 */
export async function postMarkdownAsBlocks(app: App, channelId: string, markdown: string, text: string, userId?: string) {
  const blocks = createBlocks(markdown);
  if(userId) {
    const chatPostEphemeralArguments: ChatPostEphemeralArguments = {
      channel: channelId,
      text,
      user: userId,
      blocks
    };
    await app.client.chat.postEphemeral(chatPostEphemeralArguments);
  } else {
    const chatPostMessageArguments: ChatPostMessageArguments = {
      channel: channelId,
      text,
      blocks
    };
    await app.client.chat.postMessage(chatPostMessageArguments);
  }
}

function createBlocks(markdown: string): Block[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: markdown
      }
    }
  ];
}