import * as querystring from 'querystring';
import * as util from 'util';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import axios from 'axios';

type Build = {
    "id": number,
    "stage": string,
    "name": string,
    "status": string,
    "environment": {
      "name": string,
      "action": string,
      "deployment_tier": string
    }
};
type PipelineEvent = {
  "object_kind": "pipeline",
  "object_attributes": {
    "status": string,
    "detailed_status": string,
  },
  "user": {
    "id": number,
    "name": string,
    "email": string
  },
  "project": {
    "id": 48249382,
    "name": "test-pipeline-approvals"
  },
  "builds": [Build]
};

async function lambdaHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {

  try {
    if(!event.body) {
      throw new Error("Missing event body");
    }
    const body = querystring.parse(event.body);
    const pipelineEvent = body as unknown as PipelineEvent;

    console.log(`pipelineEvent: ${util.inspect(pipelineEvent)}`);

    type PostResponse = string;

    const url = 'https://hooks.slack.com/services/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';
    const messageBody = {
      "text": `${util.inspect(pipelineEvent)}`
    };
    const options = {
      headers: {
        'Content-type': 'application/json'
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const {data, status} = await axios.post<PostResponse>(url, messageBody, options);
    if(status !== 200) {
      throw new Error(`Error ${status}`);
    }
    console.log(`status: ${util.inspect(status)}`);
    console.log(`data: ${util.inspect(data)}`);

    const json = {
      msg: 'Hello world'
    };

    const result: APIGatewayProxyResult = {
      body: JSON.stringify(json),
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