import {ActionsBlock, Button, DividerBlock, KnownBlock, SectionBlock} from "@slack/bolt";
import {ApprovalSummary, GroupInfo, PipelineEvent, UserInfo} from "./gitLabTypes";

export function generateApprovalCardBlocks(pipelineEvent: PipelineEvent, deploymentId: number, buildId: number,
  userApprovers: UserInfo[], groupApprovers: GroupInfo[], approvalSummary: ApprovalSummary): KnownBlock[] {
  let blocks: KnownBlock[] = [];
  const dividerBlock: DividerBlock = {
    type: "divider"
  };
  blocks.push(dividerBlock);

  let section: SectionBlock = {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `Pipeline <${pipelineEvent.object_attributes.url}|${pipelineEvent.object_attributes.id}> in project <${pipelineEvent.project.web_url}|${pipelineEvent.project.name}> is blocked waiting for approval.\n\n`
    }
  };
  blocks.push(section);

  blocks.push(dividerBlock);
  section = {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Approval rules*`
    }
  };
  blocks.push(section);
  for(const rule of approvalSummary.rules) {
    section = {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${rule.access_level_description} - required approvals: ${rule.required_approvals}`
      }
    };
    blocks.push(section);
  }

  blocks.push(dividerBlock);
  section = {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Individual user approvers*`
    }
  };
  blocks.push(section);
  const userApproverBlocks = userApprovers.map((userInfo): SectionBlock => {
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
  blocks = blocks.concat(userApproverBlocks);
  blocks.push(dividerBlock);

  section = {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Group Approvers*`
    }
  };
  blocks.push(section);
  const groupApproverBlocks = groupApprovers.map((groupInfo): SectionBlock => {
    const section: SectionBlock = {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${groupInfo.web_url}|*${groupInfo.name}*>`
      },
      accessory: {
        type: "image",
        image_url: groupInfo.avatar_url ? groupInfo.avatar_url : "https://about.gitlab.com/images/press/logo/png/gitlab-logo-500.png",
        alt_text: groupInfo.name
      }
    };
    return section;
  });
  blocks = blocks.concat(groupApproverBlocks);
  blocks.push(dividerBlock);

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