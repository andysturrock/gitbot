import * as util from 'util';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {InvocationType, InvokeCommand, InvokeCommandInput, LambdaClient, LambdaClientConfig} from "@aws-sdk/client-lambda";
import {verifySlackRequest} from './verifySlackRequest';
import {InteractionPayload} from './slackTypes';

/**
 * Handle the interaction posts from Slack.
 * @param event the event from Slack containing the interaction payload
 * @returns HTTP 200 back to Slack immediately to indicate the interaction payload has been received.
 */
export async function handleInteractiveEndpoint(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if(!event.body) {
      throw new Error("Missing event body");
    }
    // Verify that this request really did come from Slack
    verifySlackRequest(event.headers, event.body);

    let body = decodeURIComponent(event.body);
    // For some reason the body parses to "payload= {...}"
    // so remove the bit outside the JSON
    body = body.replace('payload=', '');
    const payload = JSON.parse(body) as InteractionPayload;

    // TODO assume we only get one Action for now
    if(payload.actions[0].action_id == "approvePipelineButton" || payload.actions[0].action_id == "rejectPipelineButton") {
      // TODO get this from config
      const configuration: LambdaClientConfig = {
        region: 'eu-west-2'
      };

      const lambdaClient = new LambdaClient(configuration);
      const input: InvokeCommandInput = {
        FunctionName: 'gitbot-handlePipelineApproval',
        InvocationType: InvocationType.Event,
        Payload: new TextEncoder().encode(JSON.stringify(payload))
      };

      const command = new InvokeCommand(input);
      const output = await lambdaClient.send(command);
      if(output.StatusCode != 202) {
        throw new Error(`Failed to invoke gitbot-handlePipelineApprovalLambda - error:${util.inspect(output.FunctionError)}`);
      }
    }
    else 
    {
      // TODO handle other interactive commands if necessary
    }

    const result: APIGatewayProxyResult = {
      body: JSON.stringify({msg: "ok"}),
      statusCode: 200
    };

    return result;
  }
  catch (error) {
    console.error(`Caught error: ${util.inspect(error)}`);

    const json = {
      error: JSON.stringify(util.inspect(error))
    };

    const result: APIGatewayProxyResult = {
      body: JSON.stringify(json),
      statusCode: 200
    };
    return result;
  }
}
