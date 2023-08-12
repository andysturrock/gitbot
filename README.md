# gitbot
GitLab <-> Slack integration.  Main purpose is to approve/reject pipelines (which are blocked by protected environments) in Slack, rather than having to use the GitLab Web UI.

# GitLab Setup
* Create a Group Access Token for your group (under Edit Group->Settings->Access Tokens) with Maintainer role and api scope.  Save it in the ``.env`` file in the `cdk` directory as `GITLAB_BOT_TOKEN`.
* Create an application for the group (under Edit Group->Settings->Applications).  Save the application ID as `GITLAB_APPID` and secret as `GITLAB_SECRET` in `.env`.  Settings (which should match those in `.env`):
  * Name: Gitbot
  * Redirect URI (matching `GITLAB_CALLBACK_URL`): gitbot.`CUSTOM_DOMAIN_NAME`/`LAMBDA_VERSION`/gitlab-oauth-redirect
  * Confidential: ✔
  * Scopes: api, openid, profile, email

# Slack Setup
* Create a Slack app
* Save the signing secret in `.env` as `SLACK_SIGNING_SECRET`
* Save the Bot User OAuth token in `.env` as `SLACK_BOT_TOKEN`
* Use the App Manifest menu and copy the contents of `gitbot-manifest.json`
* Edit the `url` and `request_url` fields with the `CUSTOM_DOMAIN_NAME` and `LAMBDA_VERSION` values from `.env`

# Deploy
Follow the instructions in the README in the cdk directory.