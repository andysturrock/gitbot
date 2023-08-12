
import {DynamoDBClient, PutItemCommand, PutItemCommandInput, QueryCommand, QueryCommandInput, DeleteItemCommand, DeleteItemCommandInput} from '@aws-sdk/client-dynamodb';
import util from 'util';

const TableName = "ProjectConfig";

export type ProjectConfig = {
  project_id: number,
  slack_channel_id: string
};

/**
 * Gets the config for the project.
 * @param projectId 
 * @returns project config or undefined if no config exists for the project
 */
export async function getProjectConfig(projectId: number) : Promise<ProjectConfig | undefined>  { 
  const ddbClient = new DynamoDBClient({});

  const params: QueryCommandInput = {
    TableName,
    KeyConditionExpression: "project_id = :project_id",
    ExpressionAttributeValues: {
      ":project_id" : {"N" : projectId.toString()}
    }
  };
  const data = await ddbClient.send(new QueryCommand(params));
  const items = data.Items;
  if(items && items[0] && items[0].config.S) {
    const config = JSON.parse(items[0].config.S) as ProjectConfig;
    return config;
  }
  else {
    return undefined;
  }
}

/**
 * Put (ie save new or overwite) config with projectId as the key
 * @param projectId Key for the table
 * @param projectConfig Config to write
 */
export async function putProjectConfig(projectId: number, projectConfig: ProjectConfig) {
  const now = Date.now();

  const putItemCommandInput: PutItemCommandInput = {
    TableName,
    Item: {
      project_id: {N: projectId.toString()},
      config: {S: JSON.stringify(projectConfig)},
      last_update_date: {N: now.toString()}
    }
  };

  const ddbClient = new DynamoDBClient({});

  await ddbClient.send(new PutItemCommand(putItemCommandInput));
}
