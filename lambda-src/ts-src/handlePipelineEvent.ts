/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as util from 'util';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {InvocationType, InvokeCommand, InvokeCommandInput, LambdaClient, LambdaClientConfig} from "@aws-sdk/client-lambda";
import {PipelineEvent} from './gitLabTypes';

async function lambdaHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if(!event.body) {
      throw new Error("Missing event body");
    }
    const pipelineEvent = JSON.parse(event.body) as PipelineEvent;

    // Builds are listed in reverse order (ie latest stage first) in the JSON.
    // TODO shouldn't rely on ordering as the JSON spec says it's an unordered set of key/value pairs.
    // So we should iterate over all the builds to find one where the stage is deploy and the status is manual.
    const stage = pipelineEvent.builds[0].stage;
    const status = pipelineEvent.builds[0].status;
    if(stage.match(/^deploy/) && status == "manual") {
      const buildId = pipelineEvent.builds[0].id;
      console.log(`We've found one!!!!! build_id: ${buildId}`);

      const configuration: LambdaClientConfig = {
        region: 'eu-west-2'
      };

      const lambdaClient = new LambdaClient(configuration);
      const input: InvokeCommandInput = {
        FunctionName: 'gitbot-handleBlockedPipelineLambda',
        InvocationType: InvocationType.Event,
        Payload: new TextEncoder().encode(JSON.stringify(pipelineEvent))
      };

      const command = new InvokeCommand(input);
      const output = await lambdaClient.send(command);
      if(output.StatusCode != 202) {
        throw new Error(`Failed to invoke gitbot-handleBlockedPipelineLambda - error:${util.inspect(output.FunctionError)}`);
      }
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

export {lambdaHandler};