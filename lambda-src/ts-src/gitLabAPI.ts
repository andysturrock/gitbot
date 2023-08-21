import axios from "axios";
import {DeploymentData, GroupInfo, OIDCUserInfo, ProjectDetails, ProjectHookDetails, UserInfo} from "./gitLabTypes";

/**
 * Gets the OIDC user info for the user who owns the token.
 * See https://docs.gitlab.com/ee/integration/openid_connect_provider.html
 * @param token access token for the user
 * @returns OIDC user info
 */
export async function getOIDCUserInfo(token: string) {

  const url = "https://gitlab.com/oauth/userinfo";
  const config = {
    headers: {Authorization: `Bearer ${token}`}
  };

  const {data} = await axios.get<OIDCUserInfo>(url, config);

  return data;
}

/**
 * Get the publicly available data on a user.  Obviously not actually public for private GitLab instances.
 * @param token access or group token
 * @returns info about the user with this id
 */
export async function getUserInfo(token: string, gitLabUserId: number) {

  const url = `https://gitlab.com/api/v4/users/${gitLabUserId}`;
  const config = {
    headers: {Authorization: `Bearer ${token}`}
  };

  const {data} = await axios.get<UserInfo>(url, config);
  return data;
}

/**
 * Get the publicly available data on a group.  Obviously not actually public for private GitLab instances.
 * @param token 
 * @param gitLabGroupId 
 * @returns 
 */
export async function getGroupInfo(token: string, gitLabGroupId: number) {
  const url = `https://gitlab.com/api/v4/groups/${gitLabGroupId}`;
  const config = {
    headers: {Authorization: `Bearer ${token}`}
  };
  const {data} = await axios.get<GroupInfo>(url, config);
  return data;
}

export async function getGroupMembers(token: string, gitLabGroupId: number) {
  const config = {
    headers: {Authorization: `Bearer ${token}`}
  };

  let allData: UserInfo[] = [];
  let page = 1;
  while(page) {
    const url = `https://gitlab.com/api/v4/groups/${gitLabGroupId}/members?page=${page}`;
    const {data, headers} = await axios.get<UserInfo>(url, config);
    allData = allData.concat(data);
    page = Number.parseInt(headers['x-next-page'] as string);
  }
  return allData;
}

/**
 * Get all the deployments for a project
 * @param token access token or bot token
 * @param projectId id of the project
 * @returns all the deployments for a project
 */
export async function getDeployments(token: string, projectId: number) {
  const config = {
    headers: {Authorization: `Bearer ${token}`}
  };

  let allData: DeploymentData[] = [];
  // The deployment API returns paginated data so we have to handle that.
  let page = 1;
  while(page) {
    const url = `https://gitlab.com/api/v4/projects/${projectId}/deployments?page=${page}`;
    const {data, headers} = await axios.get<DeploymentData[]>(url, config);
    allData = allData.concat(data);
    page = Number.parseInt(headers['x-next-page'] as string);
  }

  return allData;
}

/**
 * The Deployable within a Deployment has an id which is the id of a build from a pipeline event.
 * This function finds Deployments which contain the Deployable with the given build/deployable id.
 * @param token access or group token
 * @param projectId GitLab project id
 * @param buildId id of a build from a pipeline event which will be matched to a Deployable id
 * @returns array of Deployments with Deployables with the id matching the build id
 */
export async function getDeploymentsWithDeployableId(token: string, projectId: number, buildId: number) {
  const deployments = await getDeployments(token, projectId);

  const filteredDeployments = deployments.filter((deployment) => (deployment.deployable && deployment.deployable.id == buildId));
  return filteredDeployments;
}

/**
 * Reject a deployment which is blocked at an approval stage due to a protected environment.
 * @param token access token for the user doing the reject
 * @param projectId GitLab project id
 * @param deploymentId id of the deployment to reject
 * @returns true if the rejection succeeded, false if user doesn't have permission
 * @throws Error if the rejection failed for a reason other than permission denied
 */
export async function rejectDeployment(token: string, projectId: number, deploymentId: number) {
  return await approveOrRejectDeployment(token, projectId, deploymentId, "rejected");
}

/**
 * Approve a deployment which is blocked at an approval stage due to a protected environment.
 * @param token access token for the user doing the approval
 * @param projectId GitLab project id
 * @param deploymentId id of the deployment to approve
 * @returns true if the approval succeeded, false if user doesn't have permission
 * @throws Error if the approval failed for a reason other than permission denied
 */
export async function approveDeployment(token: string, projectId: number, deploymentId: number) {
  return await approveOrRejectDeployment(token, projectId, deploymentId, "approved");
}

async function approveOrRejectDeployment(token: string, projectId: number, deploymentId: number, status: "approved" | "rejected") {
  const url = `https://gitlab.com/api/v4/projects/${projectId}/deployments/${deploymentId}/approval`;

  const config = {
    headers: {Authorization: `Bearer ${token}`},
    // By default Axios throws for non 2xx.  We want to check for 400 below.
    validateStatus: () => true,
  };

  const data = {
    status,
    comment: `${status.charAt(0).toUpperCase() + status.slice(1)} via Slack gitbot` // Uppercase the first letter of the status string
  };

  type ApprovalResponse = {
    user: {
      id: number // user id who approved
    },
    status: string, // these echo the input data
    comment: string
  };

  // New scope so we can reuse the name "status"
  {
    const {status} = await axios.post<ApprovalResponse>(url, data, config);
    if(status == 400) {
      return false;
    }
    // Some other error
    if(status != 200 && status != 201) {
      console.error("Error calling deployment approval API:", status);
      throw new Error("Error calling deployment approval API");
    }
    return true;
  }
}

/**
 * Return the deployment data for the given deployment
 * @param token Probably a bot token, but could be a user access_token
 * @param projectId 
 * @param deploymentId 
 * @returns 
 */
export async function getDeployment(token: string, projectId: number, deploymentId: number) {
  const url = `https://gitlab.com/api/v4/projects/${projectId}/deployments/${deploymentId}`;

  const config = {
    headers: {Authorization: `Bearer ${token}`}
  };

  const {data} = await axios.get<DeploymentData>(url, config);

  return data;
}

/**
 * Play a job which has "manual" status
 * @param token 
 * @param projectId 
 * @param buildId 
 * @returns true if the pipeline is now playing, false if it can't be played for a valid reason (eg not approved)
 * @throws Error for any other reason
 */
export async function playJob(token: string, projectId: number, buildId: number) {
  const url = `https://gitlab.com/api/v4/projects/${projectId}/jobs/${buildId}/play`;

  const config = {
    headers: {Authorization: `Bearer ${token}`},
    // By default Axios throws for non 2xx.  We want to check for 400 below.
    validateStatus: () => true,
  };

  type PlayResponse = {
    message: string
  };

  const {data, status} = await axios.post<PlayResponse>(url, {}, config);
  // 403 means the protected environment hasn't been set up right.
  // The bot user must be added to the protected environment deployers.
  if(status == 403) {
    const error = `Unauthorised (403) when calling job play API.  Has the bot user been added as a deployer?`;
    console.error(error);
    throw new Error(error);
    
  }
  // 400 means the job can't be played yet
  if(status == 400 && data.message == "400 Bad request - Unplayable Job") {
    return false;
  }
  // Some other error
  if(status != 200) {
    console.error("Error calling job play API:", status, data);
    throw new Error("Error calling job play API");
  }
  return true;
}

/**
 * Get the details for the project with given name
 * @param token 
 * @param projectName 
 * @returns Array of ProjectDetails
 */
export async function getProjectDetailsByName(token: string, projectName: string) {
  const config = {
    headers: {Authorization: `Bearer ${token}`}
  };

  const searchParam = encodeURIComponent(projectName);

  let allData: ProjectDetails[] = [];
  // The deployment API returns paginated data so we have to handle that.
  let page = 1;
  while(page) {
    const url = `https://gitlab.com/api/v4/projects/?search=${searchParam}&page=${page}`;
    const {data, headers} = await axios.get<ProjectDetails[]>(url, config);
    const matchingNameProjects = data.filter(projectDetails => {
      return projectDetails.name === projectName;
    });
    allData = allData.concat(matchingNameProjects);

    page = Number.parseInt(headers['x-next-page'] as string);
  }

  return allData;
}

export async function getProjectDetailsById(token: string, projectId: number) {
  const url = `https://gitlab.com/api/v4/projects/${projectId}`;

  const config = {
    headers: {Authorization: `Bearer ${token}`}
  };

  const {data} = await axios.get<ProjectDetails>(url, config);

  return data;
}

/**
 * Retreive all the current hook data for the given project
 * @param token 
 * @param projectId 
 * @returns Array of ProjectHookDetails
 */
export async function listProjectHooks(token: string, projectId: number) {
  const config = {
    headers: {Authorization: `Bearer ${token}`}
  };
  let allData: ProjectHookDetails[] = [];
  // The deployment API returns paginated data so we have to handle that.
  let page = 1;
  while(page) {
    const url = `https://gitlab.com/api/v4/projects/${projectId}/hooks?page=${page}`;
    const {data, headers} = await axios.get<ProjectHookDetails[]>(url, config);
    allData = allData.concat(data);

    page = Number.parseInt(headers['x-next-page'] as string);
  }

  return allData;
}

/**
 * Add a new hook to the given project
 * @param token 
 * @param projectId 
 * @param projectHookDetails 
 */
export async function createProjectHook(token: string, projectId: number, projectHookDetails: ProjectHookDetails) {
  const url = `https://gitlab.com/api/v4/projects/${projectId}/hooks`;

  const config = {
    headers: {Authorization: `Bearer ${token}`}
  };

  await axios.post(url, projectHookDetails, config);
}

/**
 * Edit an existing hook for the given project
 * @param token 
 * @param projectId 
 * @param hookId 
 * @param projectHookDetails 
 */
export async function editProjectHook(token: string, projectId: number, hookId: number, projectHookDetails: ProjectHookDetails) {
  const url = `https://gitlab.com/api/v4/projects/${projectId}/hooks/${hookId}`;

  const config = {
    headers: {Authorization: `Bearer ${token}`}
  };

  await axios.put(url, projectHookDetails, config);
}