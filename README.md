# GitBot
GitLab <-> Slack integration.  Main purpose is to approve/reject pipelines (which are blocked by protected environments) in Slack, rather than having to use the GitLab Web UI.

# Custom domain
Create a Route 53 zone in this account to host your custom domain.  Replace `example.com` with your custom domain.

# GitLab Setup
* Create a Group Access Token for your group (under Edit Group->Settings->Access Tokens) with Maintainer role and api scope.
* Create an application for the group (under Edit Group->Settings->Applications).  GitLab settings:
  * Name: `GitBot`
  * Redirect URI: `gitbot.slack.example.com/0_0_1/gitlab-oauth-redirect`
  * Confidential: ✔
  * Scopes: `api, openid, profile, email`
* If you want to use groups to approve the pipelines use these steps:
  1. Create one or more approver groups as child groups of the parent group of your project (ie they are the same level as your project).
  2. Add your approver groups as Reporter level to your project.
  3. Create a group with Developer level.  These people can change the code and run the pipelines, but won't be able to approve the pipelines.
  4. Add the developer groups to your project.
  5. Now set up the approval rules at the parent group level.  Use Postman or similar to `POST` to `https://gitlab.com/api/v4/groups/{{top-group-id}}/protected_environments`.  The auth token will need Owner role on the group.  The body of the POST should be something like:
```
{
    "name": "production",
    "deploy_access_levels": [
        {
            "group_id": {{developer_group_id}}
        },
        {
            "user_id": {{bot_user_id}}
        }
    ],
    "approval_rules": [
        {
            "group_id": {{Approval group 1 group_id}},
            "required_approvals": 1
        },
        {
            "group_id": {{Approval group 2 group_id}},
            "required_approvals": 1
        }
    ]
}
```

# Slack Setup
* Create a Slack app
* Use the App Manifest menu and copy the contents of `gitbot-manifest.json`
* Edit the `url` and `request_url` fields with the `CUSTOM_DOMAIN_NAME` and `LAMBDA_VERSION` values from `.env`

# AWS Secrets Manager settings
The CDK will create a secret called `GitBot` for you, but you need to populate it with these keys:
```
{
  "gitLabAppId": "alphanum",
  "gitLabSecret": "alphanum",
  "customDomainName": "slack.example.com",
  "gitBotUrl": "https://gitbot.slack.example.com/0_0_1",
  "gitLabScopes": "openid+profile+email+api",
  "gitLabAuthorizeUrl": "https://gitlab.com/oauth/authorize",
  "gitLabBotToken": "glpat-alphanum",
  "slackSigningSecret": "alphanum",
  "slackBotToken": "xoxb-alphanum",
  "slackClientId": "num.num",
  "slackClientSecret": "alphanum"
}
```
The values should be copied from the GitLab and Slack setups above.

# The `cdk/.env` file
Your `.env` file in the `cdk` directory should look something like the `env.template` file:
```
CUSTOM_DOMAIN_NAME=gitbot.slack.example.com
R53_ZONE_ID=ZXYZ123
LAMBDA_VERSION=0.0.1
```
Note that the custom domain name in `.env` and Secrets Manager must match, as must the Lambda version, with the version in the `.env` file being dot notation and converted to underscores for the URL in Secrets Manager.

The Route 53 zone id in the `.env` file is the zone referred to above so that records can be added to it by CDK.

# Deploy
Follow the instructions in the README in the `cdk` directory.