import {ActionsBlock, Button, DividerBlock, KnownBlock, SectionBlock} from "@slack/bolt";
import {PipelineEvent, UserInfo} from "./gitLabTypes";
import util from 'util';


export function generateApprovalCardBlocks(pipelineEvent: PipelineEvent, deploymentId: number, buildId: number, approvers: UserInfo[]): KnownBlock[] {
  let blocks: KnownBlock[] = [];
  const dividerBlock: DividerBlock = {
    type: "divider"
  };
  blocks.push(dividerBlock);

  const section: SectionBlock = {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `Pipeline <${pipelineEvent.object_attributes.url}|${pipelineEvent.object_attributes.id}> in project <${pipelineEvent.project.web_url}|${pipelineEvent.project.name}> is blocked waiting for approval.\n\n *Approvers:*`
    }
  };
  blocks.push(section);

  const approverBlocks = approvers.map((userInfo) : SectionBlock => {
    const section: SectionBlock = {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${userInfo.web_url}|*${userInfo.name}*>`
      },
      accessory: {
        type: "image",
        image_url: userInfo.avatar_url,
        alt_text: userInfo.name
      }
    };
    return section;
  });
  blocks = blocks.concat(approverBlocks);

  const approveButton: Button = {
    type: "button",
    text: {
      "type": "plain_text",
      "text": "Approve",
      "emoji": true
    },
    style: "primary",
    action_id: "approvePipelineButton",
    // don't use spaces in the string below as they get encoded as + signs
    value: `{"action":"approve","project_id":"${pipelineEvent.project.id}","deployment_id":"${deploymentId}","build_id":${buildId}}`
  };
  const rejectButton: Button = {
    type: "button",
    text: {
      "type": "plain_text",
      "text": "Reject",
      "emoji": true
    },
    style: "danger",
    action_id: "rejectPipelineButton",
    value: `{"action":"reject","project_id":"${pipelineEvent.project.id}","deployment_id":"${deploymentId}","build_id":${buildId}}`
  };
  const actionsBlock: ActionsBlock = {
    type: "actions",
    elements: [
      approveButton,
      rejectButton
    ]
  };
  blocks.push(actionsBlock);
  blocks.push(dividerBlock);
  
  return blocks;
}