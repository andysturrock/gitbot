import axios from "axios";
import * as util from 'util';

export async function postMarkdownBlocks(response_url: string, text: string, replaceOriginal: boolean = false) {
  const blocks = {
    replace_original: replaceOriginal,
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
  const result = await axios.post(response_url, blocks);
  if(result.status !== 200) {
    throw new Error(`Error ${util.inspect(result.statusText)} posting response: ${util.inspect(result.data)}`);
  }
}