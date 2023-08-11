import {verifySlackRequest as _verifySlackRequest} from '@slack/bolt';
import {SlackRequestVerificationOptions} from '@slack/bolt/dist/receivers/verify-request';
import {APIGatewayProxyEventHeaders} from 'aws-lambda';

// TODO - make this generic across AWS and GCP
export function verifySlackRequest(headers: APIGatewayProxyEventHeaders, body: string) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if(!signingSecret) {
    throw new Error("Missing env var SLACK_SIGNING_SECRET");
  }

  let x_slack_signature = headers['X-Slack-Signature'];
  if(!x_slack_signature) {
    throw new Error("Missing X-Slack-Signature header");
  }
  if(Array.isArray(x_slack_signature)) {
    x_slack_signature = x_slack_signature[0] as string;
  }

  let x_slack_request_timestamp = headers['X-Slack-Request-Timestamp'];
  if(!x_slack_request_timestamp) {
    throw new Error("Missing X-Slack-Request-Timestamp header");
  }
  if(Array.isArray(x_slack_request_timestamp)) {
    x_slack_request_timestamp = x_slack_request_timestamp[0] as string;
  }
  const number_x_slack_request_timestamp = parseInt(x_slack_request_timestamp);

  const slackRequestVerificationOptions: SlackRequestVerificationOptions = {
    signingSecret: signingSecret,
    body: body,
    headers: {
      'x-slack-signature': x_slack_signature ,
      'x-slack-request-timestamp': number_x_slack_request_timestamp
    }
  };

  // Throws an exception with details if invalid.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  _verifySlackRequest(slackRequestVerificationOptions);
}
