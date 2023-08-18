# gitbot
GitLab <-> Slack integration.  Main purpose is to approve/reject pipelines (which are blocked by protected environments) in Slack, rather than having to use the GitLab Web UI.

# GitLab Setup
* Create a Group Access Token for your group (under Edit Group->Settings->Access Tokens) with Maintainer role and api scope.  Save it in the ``.env`` file in the `cdk` directory as `GITLAB_BOT_TOKEN`.
* Create an application for the group (under Edit Group->Settings->Applications).  Save the application ID as `GITLAB_APPID` and secret as `GITLAB_SECRET` in `.env`.  Settings (which should match those in `.env`):
  * Name: Gitbot
  * Redirect URI: gitbot.`CUSTOM_DOMAIN_NAME`/`LAMBDA_VERSION`/gitlab-oauth-redirect
  * Confidential: ✔
  * Scopes: api, openid, profile, email
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
* Save the signing secret in `.env` as `SLACK_SIGNING_SECRET`
* Save the Bot User OAuth token in `.env` as `SLACK_BOT_TOKEN`
* Use the App Manifest menu and copy the contents of `gitbot-manifest.json`
* Edit the `url` and `request_url` fields with the `CUSTOM_DOMAIN_NAME` and `LAMBDA_VERSION` values from `.env`

# Deploy
Follow the instructions in the README in the cdk directory.