import axios, {AxiosRequestConfig} from 'axios';

export type TokenResponse = {
  access_token: string,
  token_type: string,
  expires_in: number,
  refresh_token: string
  created_at: number
 };

/**
  * Gets a new set of tokens using the given refreshToken.
  * Note that the refresh token itself will be updated,
  * so the caller of this function is advised to re-persist
  * the new refresh token that is returned.
  * @param refreshToken 
  * @returns a refreshed set of tokens
  */
export async function refreshToken(refreshToken: string) {

  // TODO Cache the token while it is still valid rather
  // than going back to the API each call.
  const client_id = process.env.GITLAB_APPID;
  if(!client_id) {
    throw new Error("Missing env var GITLAB_APPID");
  }
  const client_secret = process.env.GITLAB_SECRET;
  if(!client_secret) {
    throw new Error("Missing env var GITLAB_SECRET");
  }
  const gitbotUrl = process.env.GITBOT_URL;
  if(!gitbotUrl) {
    throw new Error("Missing env var GITBOT_URL");
  }
  const redirect_uri = `${gitbotUrl}/gitlab-oauth-redirect`;

  const config: AxiosRequestConfig = {
    params: {
      client_id,
      client_secret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      redirect_uri
    }
  };
  const url = 'https://gitlab.com/oauth/token';

  const {data} = await axios.post<TokenResponse>(url, {}, config);

  return data;
}