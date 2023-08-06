/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as util from 'util';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {InvocationType, InvokeCommand, InvokeCommandInput, LambdaClient, LambdaClientConfig} from "@aws-sdk/client-lambda";
import {verifySlackRequest} from './verifySlackRequest';
import querystring from 'querystring';

/**
 * Handle the slash command from Slack.  Dispatches to other lambdas depending on command arguments.
 * @param event 
 * @returns HTTP 200 back to Slack immediately to indicate the slash command has been received.
 */
async function lambdaHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if(!event.body) {
      throw new Error("Missing event body");
    }
    type Body = {
      token: string,
      team_id: string,
      team_domain: string,
      channel_id: string,
      channel_name: string,
      user_id: string,
      user_name: string,
      command: string,
      text: string,
      api_app_id: string,
      is_enterprise_install: string,
      response_url: string,
      trigger_id:string
    };

    const body = querystring.parse(event.body) as Body;

    console.log(`body: ${util.inspect(body)}`);

    // Verify that this request really did come from Slack
    verifySlackRequest(event.headers, event.body);

    // Default response to tell the user we're doing something.
    let blocks = {
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Working on that...`
          }
        }
      ]
    };

    // Now dispatch to other lambdas based on the command arguments
    if(body.text == "login") {
      // TODO get this from config
      const configuration: LambdaClientConfig = {
        region: 'eu-west-2'
      };

      const lambdaClient = new LambdaClient(configuration);
      const input: InvokeCommandInput = {
        FunctionName: 'gitbot-handleLoginLambda',
        InvocationType: InvocationType.Event,
        Payload: new TextEncoder().encode(JSON.stringify(body))
      };

      const command = new InvokeCommand(input);
      const output = await lambdaClient.send(command);
      if(output.StatusCode != 202) {
        throw new Error(`Failed to invoke gitbot-handleLoginLambda - error:${util.inspect(output.FunctionError)}`);
      }
    }
    else {
      blocks = {
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Usage: /gitbot [login]`
            }
          }
        ]
      };
    }

    const result: APIGatewayProxyResult = {
      body: JSON.stringify(blocks),
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

export {lambdaHandler};