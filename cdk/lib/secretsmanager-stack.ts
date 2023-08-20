import {SecretValue, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import {getEnv} from './common';

export class SecretsManagerStack extends Stack {
  public readonly gitBotSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Secrets aren't deleted immediately, so try to find the existing one.
    this.gitBotSecret = secretsmanager.Secret.fromSecretNameV2(this, 'gitBotSecret', "GitBot");
    // If we can't find it we'll create it
    if(!this.gitBotSecret) {
      const lambdaVersion = getEnv('LAMBDA_VERSION', false)!;
      const customDomainName = getEnv('CUSTOM_DOMAIN_NAME', false)!;
      const gitbotDomainName = `gitbot.${customDomainName}`;
      // Semantic versioning has dots as separators but this is invalid in a URL
      // so replace the dots with underscores first.
      const lambdaVersionIdForURL = lambdaVersion.replace(/\./g, '_');
      const gitBotUrl = `https://${gitbotDomainName}/${lambdaVersionIdForURL}`;

      // Create the secret and add non-secret values from env vars and
      // dummy values for secret values to determine the shape.
      // Don't add secret values here as they show
      // in the CloudFormation template that is generated and can be seen
      // in the CloudFormation web UI.
      this.gitBotSecret = new secretsmanager.Secret(this, 'gitBotSecret', {
        secretName: "GitBot",
        description: "Secrets used by GitBot",
        secretObjectValue: {
          customDomainName: SecretValue.unsafePlainText(customDomainName),
          gitBotUrl: SecretValue.unsafePlainText(gitBotUrl),
          gitLabAppId: SecretValue.unsafePlainText("dummy"),
          gitLabSecret: SecretValue.unsafePlainText("dummy"),
          gitLabScopes: SecretValue.unsafePlainText("dummy"),
          gitLabAuthorizeUrl: SecretValue.unsafePlainText("dummy"),
          gitLabBotToken: SecretValue.unsafePlainText("dummy"),
          slackSigningSecret: SecretValue.unsafePlainText("dummy"),
          slackBotToken: SecretValue.unsafePlainText("dummy"),
          slackClientId: SecretValue.unsafePlainText("dummy"),
          slackClientSecret: SecretValue.unsafePlainText("dummy")
        },
      });
    }
  }
}
