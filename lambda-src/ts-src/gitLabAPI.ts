import axios from "axios";
import util from 'util';
import {DeploymentData, OIDCUserInfo, ProjectDetails, UserInfo} from "./gitLabTypes";

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

  const {data, status} = await axios.get<OIDCUserInfo>(url, config);
  if(status != 200) {
    throw new Error("");
  }

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

  const {data, status} = await axios.get<UserInfo>(url, config);
  if(status != 200) {
    throw new Error("");
  }

  return data;
}

export async function getDeployments(token: string, projectId: number) {
  const config = {
    headers: {Authorization: `Bearer ${token}`}
  };

  let allData: DeploymentData[] = [];
  // The deployment API returns paginated data so we have to handle that.
  let page = 1;
  while(page) {
    const url = `https://gitlab.com/api/v4/projects/${projectId}/deployments?page=${page}`;
    const {data, status, headers} = await axios.get<DeploymentData[]>(url, config);
    if(status != 200) {
      throw new Error("");
    }
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
 * @param token access token for the user doing the approval
 * @param projectId GitLab project id
 * @param deploymentId id of the deployment to approve
 */
export async function rejectDeployment(token: string, projectId: number, deploymentId: number) {
  await approveOrRejectDeployment(token, projectId, deploymentId, "rejected");
}

/**
 * Approve a deployment which is blocked at an approval stage due to a protected environment.
 * @param token access token for the user doing the approval
 * @param projectId GitLab project id
 * @param deploymentId id of the deployment to approve
 */
export async function approveDeployment(token: string, projectId: number, deploymentId: number) {
  await approveOrRejectDeployment(token, projectId, deploymentId, "approved");
}

async function approveOrRejectDeployment(token: string, projectId: number, deploymentId: number, status: "approved" | "rejected") {
  const url = `https://gitlab.com/api/v4/projects/${projectId}/deployments/${deploymentId}/approval`;

  const config = {
    headers: {Authorization: `Bearer ${token}`}
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

  const response = await axios.post<ApprovalResponse>(url, data, config);
  if(response.status != 201) { // Note status is 201 "created"
    console.error("Error calling pipeline approval API:", response);
    throw new Error("Error calling pipeline approval API");
  }
}

export async function getDeployment(token: string, projectId: number, deploymentId: number) {
  const url = `https://gitlab.com/api/v4/projects/${projectId}/deployments/${deploymentId}`;

  const config = {
    headers: {Authorization: `Bearer ${token}`}
  };

  const {data, status} = await axios.get<DeploymentData>(url, config);
  if(status != 200) {
    throw new Error("");
  }

  return data;
}

export async function playJob(token: string, projectId: number, buildId: number) {
  const url = `https://gitlab.com/api/v4/projects/${projectId}/jobs/${buildId}/play`;

  const config = {
    headers: {Authorization: `Bearer ${token}`}
  };

  const response = await axios.post(url, {}, config);
  if(response.status != 200) {
    console.error("Error calling pipeline approval API:", response);
    throw new Error("Error calling job play API");
  }
}

export async function getProjectDetails(token: string, projectName: string) {
  const config = {
    headers: {Authorization: `Bearer ${token}`}
  };

  const searchParam = encodeURIComponent(projectName);

  let allData: ProjectDetails[] = [];
  // The deployment API returns paginated data so we have to handle that.
  let page = 1;
  while(page) {
    const url = `https://gitlab.com/api/v4/projects/?search=${searchParam}&page=${page}`;
    const {data, status, headers} = await axios.get<ProjectDetails[]>(url, config);
    if(status != 200) {
      throw new Error("");
    }
    const matchingNameProjects = data.filter(projectDetails => {
      return projectDetails.name === projectName;
    });
    allData = allData.concat(matchingNameProjects);

    page = Number.parseInt(headers['x-next-page'] as string);
  }

  return allData;
}