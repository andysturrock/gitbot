/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as util from 'util';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {InvocationType, InvokeCommand, InvokeCommandInput, LambdaClient, LambdaClientConfig} from "@aws-sdk/client-lambda";
import {verifySlackRequest} from './verifySlackRequest';
import querystring from 'querystring';
import {GitbotOptions, parseGitbotArgs} from './parseSlashCommand';
import {SlashCommandPayload} from './slackTypes';

/**
 * Handle the slash command from Slack.  Dispatches to other lambdas depending on command arguments.
 * @param event 
 * @returns HTTP 200 back to Slack immediately to indicate the slash command has been received.
 */
export async function handleSlashCommand(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if(!event.body) {
      throw new Error("Missing event body");
    }

    const body = querystring.parse(event.body) as unknown as SlashCommandPayload;

    // Verify that this request really did come from Slack
    verifySlackRequest(event.headers, event.body);

    // Response giving a usage message if we can't find anything else or fail to parse at all.
    const usageBlocks = {
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Usage: /gitbot [login | help | ? | project [help] | project <id|name> connect]`
          }
        }
      ]
    };

    let gitbotOptions: GitbotOptions = {    
    };
    try {
      gitbotOptions = parseGitbotArgs(body.text);
    }
    catch (error) {
      gitbotOptions.help = true;
    }

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
    if(gitbotOptions.login) {
      // TODO get this from config
      const configuration: LambdaClientConfig = {
        region: 'eu-west-2'
      };

      const lambdaClient = new LambdaClient(configuration);
      const input: InvokeCommandInput = {
        FunctionName: 'gitbot-handleLoginCommand',
        InvocationType: InvocationType.Event,
        Payload: new TextEncoder().encode(JSON.stringify(body))
      };

      const command = new InvokeCommand(input);
      const output = await lambdaClient.send(command);
      if(output.StatusCode != 202) {
        throw new Error(`Failed to invoke gitbot-handleLoginLambda - error:${util.inspect(output.FunctionError)}`);
      }
    }
    else if(gitbotOptions.projectIdentifier || gitbotOptions.projectHelp) {
      body.projectIdentifier = gitbotOptions.projectIdentifier;
      body.projectHelp = gitbotOptions.projectHelp;
      // TODO get this from config
      const configuration: LambdaClientConfig = {
        region: 'eu-west-2'
      };

      const lambdaClient = new LambdaClient(configuration);
      const input: InvokeCommandInput = {
        FunctionName: 'gitbot-handleProjectCommand',
        InvocationType: InvocationType.Event,
        Payload: new TextEncoder().encode(JSON.stringify(body))
      };

      const command = new InvokeCommand(input);
      const output = await lambdaClient.send(command);
      if(output.StatusCode != 202) {
        throw new Error(`Failed to invoke gitbot-handleProjectLambda - error:${util.inspect(output.FunctionError)}`);
      }
    }
    else {
      blocks = usageBlocks;
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
