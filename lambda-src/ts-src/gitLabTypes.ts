export type Build = {
  id: number,
  stage: string,
  name: string,
  status: string,
  environment: {
    name: string,
    action: string,
    deployment_tier: string
  }
};
export type PipelineEvent = {
  object_kind: "pipeline",  //Theoretically could be something different, but won't be
  object_attributes: {
    id: number,
    status: string,
    detailed_status: string,
    url: string
  },
  user: {
    id: number,
    name: string,
    username: string,
    email: string
  },
  project: {
    id: number,
    name: string,
    web_url: string
  },
  builds: Build[]
};

export type Environment = {
  id: number,
  name: string,
};

export type Deployable = {
  id: number,
  status: string,
  stage: string,
  name: string,
};

export type Approval = {
  user: {
    id: number,
    username: string,
    name: string,
    state: string,
    avatar_url: string,
    web_url: string
  },
  status: string,
  comment: string
};

export type OIDCUserInfo = {
  sub: number,
  name: string,
  nickname: string,
  preferred_username: string,
  email: string
};

export type UserInfo = {
  id: number,
  username: string,
  name: string,
  avatar_url: string,
  web_url: string
};

export type ApprovalSummary = {
  rules: [
    {
      id: number,
      user_id: number,
      group_id: number,
      required_approvals: number,
      deployment_approvals: Approval[]
    }]
};
export type DeploymentData = {
  id: number,
  environment: Environment,
  deployable: Deployable,
  status: string,
  pending_approval_count: number,
  approvals: Approval[],
  approval_summary: ApprovalSummary
};

export type ProjectDetails = {
  id: number,
  description: string,
  name: string,
};