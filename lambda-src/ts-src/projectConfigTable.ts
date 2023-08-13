
import {DynamoDBClient, PutItemCommand, PutItemCommandInput, QueryCommand, QueryCommandInput, ScanCommand, ScanCommandInput} from '@aws-sdk/client-dynamodb';

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

/**
 * Gets all the project config from the table
 * @returns array of ProjectConfig items
 */
export async function getAllProjectConfig()  { 
  const ddbClient = new DynamoDBClient({});

  const params: ScanCommandInput = {
    TableName
  };
  const data = await ddbClient.send(new ScanCommand(params));

  const projectConfig: ProjectConfig[] = [];
  data.Items?.forEach(item => {
    if(item.config.S) {
      projectConfig.push(JSON.parse(item.config.S) as ProjectConfig);
    }
  });

  return projectConfig;
}
