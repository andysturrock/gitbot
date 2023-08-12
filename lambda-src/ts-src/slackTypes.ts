export type SlashCommandPayload = {
  token: string,
  team_id: string,
  team_domain: string,
  channel_id: string,
  channel_name: string,
  user_id: string,
  user_name: string,
  command: string,
  text: string,
  api_app_id: string,
  is_enterprise_install: string,
  response_url: string,
  trigger_id: string,
  projectIdentifier?: string,
  projectHelp?: boolean
};

export type Action = {
  action_id: string,
  value: string
};

export type InteractionPayload = {
  type: string,
  user: {
    id: string,
    username: string,
    name: string,
    team_id: string,
  },
  team: {
    id: string,
    domain: string
  },
  channel: {
    id: string,
    name: string,
  },
  response_url: string,
  actions: Action[]
};