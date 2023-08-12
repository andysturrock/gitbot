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

export type ProjectHookEvent = {
  object_kind: string,
  object_attributes: {
    id: number,
    status: string,
    detailed_status: string,
    url: string
  },
  project: {
    id: number,
    name: string,
    web_url: string,
    // This doesn't come from GitLab.  It's added in handleProjectHookEvent
    slack_channel_id: string
  },
};

export type PipelineEvent = ProjectHookEvent & {
  user: {
    id: number,
    name: string,
    username: string,
    email: string
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
  web_url: string
};

export type ProjectHookDetails = {
  /** hook id for GET, project id for POST and PUT */
  id: number,
  /** used in PUT (edit) */
  hook_id: number,
  /** Returned in GET */
  project_id: number,
  url: string,
  created_at?: string,
  push_events?: boolean,
  tag_push_events?: boolean,
  merge_requests_events?: boolean,
  repository_update_events?: boolean,
  enable_ssl_verification?: boolean,
  alert_status?: string,
  disabled_until?: string,
  issues_events?: boolean,
  confidential_issues_events?: boolean,
  note_events?: boolean,
  confidential_note_events?: boolean,
  pipeline_events?: boolean,
  wiki_page_events?: boolean,
  deployment_events?: boolean,
  job_events?: boolean,
  releases_events?: boolean,
  push_events_branch_filter?: string,
  emoji_events?: boolean
};