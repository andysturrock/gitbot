import * as util from 'util';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {InvocationType, InvokeCommand, InvokeCommandInput, LambdaClient, LambdaClientConfig} from "@aws-sdk/client-lambda";
import {PipelineEvent, ProjectHookEvent} from './gitLabTypes';
import {getProjectConfig} from './projectConfigTable';

export async function handleProjectHookEvent(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if(!event.body) {
      throw new Error("Missing event body");
    }
    const projectHookEvent = JSON.parse(event.body) as ProjectHookEvent;

    const projectConfig = await getProjectConfig(projectHookEvent.project.id);
    if(!projectConfig) {
      console.debug(`Ignoring blocked pipeline event for project`);
      return {
        body: "OK",
        statusCode: 200
      };
    }
    projectHookEvent.project.slack_channel_id = projectConfig.slack_channel_id;

    if(projectHookEvent.object_kind === "pipeline") {
      const pipelineEvent: PipelineEvent = projectHookEvent as PipelineEvent;
      const configuration: LambdaClientConfig = {
        region: 'eu-west-2'
      };

      const lambdaClient = new LambdaClient(configuration);
      const input: InvokeCommandInput = {
        FunctionName: 'gitbot-handlePipelineEvent',
        InvocationType: InvocationType.Event,
        Payload: new TextEncoder().encode(JSON.stringify(pipelineEvent))
      };

      const command = new InvokeCommand(input);
      const output = await lambdaClient.send(command);
      if(output.StatusCode != 202) {
        throw new Error(`Failed to invoke gitbot-handlePipelineEventLambda - error:${util.inspect(output.FunctionError)}`);
      }
    }
    else {
      console.warn(`Unexpected project hook type ${projectHookEvent.object_kind}`);
    }

    const result: APIGatewayProxyResult = {
      body: "OK",
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
