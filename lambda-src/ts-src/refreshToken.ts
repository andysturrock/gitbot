import axios, {AxiosRequestConfig} from 'axios';
import util from 'util';

type TokenResponse = {
  access_token: string,
  token_type: string,
  expires_in: number,
  refresh_token: string
  created_at: number
 };

async function getAccessToken(refreshToken: string) {

  const client_id = process.env.GITLAB_APPID;
  if(!client_id) {
    throw new Error("Missing env var GITLAB_APPID");
  }
  const client_secret = process.env.GITLAB_SECRET;
  if(!client_secret) {
    throw new Error("Missing env var GITLAB_SECRET");
  }
  const redirect_uri = process.env.GITLAB_CALLBACK_URL;
  if(!redirect_uri) {
    throw new Error("Missing env var GITLAB_CALLBACK_URL");
  }

  // parameters = 'client_id=APP_ID&client_secret=APP_SECRET&refresh_token=REFRESH_TOKEN&grant_type=refresh_token&redirect_uri=REDIRECT_URI'
  // RestClient.post 'https://gitlab.example.com/oauth/token', parameters
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

  const {data, status} = await axios.post<TokenResponse>(url, {}, config);
  if(status !== 200) {
    throw new Error(`Error ${status}`);
  }
  console.log(`status: ${util.inspect(status)}`);
  console.log(`data: ${util.inspect(data)}`);

  return data;
}

export {getAccessToken};