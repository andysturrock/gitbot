import axios from "axios";
import util from 'util';

export async function postMarkdownAsBlocks(response_url: string, text: string, replaceOriginal: boolean = false, inChannel: boolean = false) {
  type Block = {
    type: "section",
    text: {
      type: "mrkdwn",
      text: string
    }
  };
  type Blocks = {
    replace_original?: string,
    response_type?: string,
    blocks: Block[]
  };
  const blocks: Blocks = {
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

  blocks.replace_original = String(replaceOriginal);
  if(inChannel) {
    blocks.response_type = "in_channel";
  }

  console.log(`********** blocks = ${util.inspect(blocks)}`);
  await axios.post(response_url, blocks);
}