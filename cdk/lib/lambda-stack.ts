import {Duration, Stack} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import {LambdaStackProps, getEnv} from './common';

export class LambdaStack extends Stack {
  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const r53ZoneId = getEnv('R53_ZONE_ID', false)!;
    const lambdaVersion = getEnv('LAMBDA_VERSION', false)!;
    const customDomainName = getEnv('CUSTOM_DOMAIN_NAME', false)!;
    const gitLabAppId = getEnv('GITLAB_APPID', false)!;
    const gitLabSecret = getEnv('GITLAB_SECRET', false)!;
    const gitLabCallbackUrl = getEnv('GITLAB_CALLBACK_URL', false)!;
    const gitLabAuthorizeUrl = getEnv('GITLAB_AUTHORIZE_URL', false)!;
    const gitLabScopes = getEnv('GITLAB_SCOPES', false)!;
    const slackSigningSecret = getEnv('SLACK_SIGNING_SECRET', false)!;
    const slackBotToken = getEnv('SLACK_BOT_TOKEN', false)!;
    const gitLabBotToken = getEnv('GITLAB_BOT_TOKEN', false)!;
    const gitlabApprovalsDomainName = `gitbot.${customDomainName}`;
    // Semantic versioning has dots as separators but this is invalid in a URL
    // so replace the dots with underscores first.
    const lambdaVersionIdForURL = lambdaVersion.replace(/\./g, '_');

    // Create the lambda for handling interactions.  This one dispatches to other lambdas depending on
    // which interactive component has been used and what that needs to do.
    const handleInteractiveEndpointLambda = new lambda.Function(this, "handleInteractiveEndpointLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("../lambda-src/dist/lambda.zip"),
      handler: "handleInteractiveEndpoint.handleInteractiveEndpoint",
      logRetention: logs.RetentionDays.THREE_DAYS,
      functionName: 'gitbot-handleInteractiveEndpoint'
    });
    handleInteractiveEndpointLambda.addEnvironment('SLACK_SIGNING_SECRET', slackSigningSecret);

    // Create the lambda for handling the approval and restart of the pipeline.
    // It is called from the handleInteractiveEndpointLambda.
    const handlePipelineApprovalLambda = new lambda.Function(this, "handlePipelineApprovalLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("../lambda-src/dist/lambda.zip"),
      handler: "handlePipelineApproval.handlePipelineApproval",
      logRetention: logs.RetentionDays.THREE_DAYS,
      functionName: 'gitbot-handlePipelineApproval',
      timeout: Duration.seconds(10)
    });
    // This function is going to be invoked asynchronously, so set some extra config for that
    new lambda.EventInvokeConfig(this, 'handlePipelineApprovalLambdaInvokeConfig', {
      function: handlePipelineApprovalLambda,
      maxEventAge: Duration.minutes(2),
      retryAttempts: 2,
    });
    // Allow access to the relevant DynamoDB tables
    props.userDataTable.grantReadWriteData(handlePipelineApprovalLambda);
    // Give the interactive command handler lambda permission to invoke this one
    handlePipelineApprovalLambda.grantInvoke(handleInteractiveEndpointLambda);
    // Env vars
    handlePipelineApprovalLambda.addEnvironment('GITLAB_APPID', gitLabAppId);
    handlePipelineApprovalLambda.addEnvironment('GITLAB_CALLBACK_URL', gitLabCallbackUrl);
    handlePipelineApprovalLambda.addEnvironment('GITLAB_SECRET', gitLabSecret);

    // Create the lambda for handling the slash command from Slack
    const handleSlashCommandLambda = new lambda.Function(this, "handleSlashCommandLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("../lambda-src/dist/lambda.zip"),
      handler: "handleSlashCommand.handleSlashCommand",
      logRetention: logs.RetentionDays.THREE_DAYS,
      functionName: 'gitbot-handleSlashCommand'
    });
    handleSlashCommandLambda.addEnvironment('SLACK_SIGNING_SECRET', slackSigningSecret);

    // Create the lambda for handling project subcommands from the slash command.
    // It is called from the handleSlashCommandLambda.
    const handleProjectCommandLambda = new lambda.Function(this, "handleProjectCommandLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("../lambda-src/dist/lambda.zip"),
      handler: "handleProjectCommand.handleProjectCommand",
      logRetention: logs.RetentionDays.THREE_DAYS,
      functionName: 'gitbot-handleProjectCommand',
      timeout: Duration.seconds(10)
    });
    // This function is going to be invoked asynchronously, so set some extra config for that
    new lambda.EventInvokeConfig(this, 'handleProjectCommandLambdaEventInvokeConfig', {
      function: handleProjectCommandLambda,
      maxEventAge: Duration.minutes(2),
      retryAttempts: 2,
    });
    // Give the slash command lambda permission to invoke this one
    handleProjectCommandLambda.grantInvoke(handleSlashCommandLambda);
    // Allow access to the relevant DynamoDB table
    props.projectConfigTable.grantReadWriteData(handleProjectCommandLambda);
    // It makes some API calls as the bot user.
    handleProjectCommandLambda.addEnvironment('GITLAB_BOT_TOKEN', gitLabBotToken);
    handleProjectCommandLambda.addEnvironment('CUSTOM_DOMAIN_NAME', customDomainName);
    handleProjectCommandLambda.addEnvironment('LAMBDA_VERSION', lambdaVersion);

    // Create the lambda for handling the login subcommand from the slash command.
    // It is called from the handleSlashCommandLambda.
    const handleLoginCommandLambda = new lambda.Function(this, "handleLoginCommandLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("../lambda-src/dist/lambda.zip"),
      handler: "handleLoginCommand.handleLoginCommand",
      logRetention: logs.RetentionDays.THREE_DAYS,
      functionName: 'gitbot-handleLoginCommand'
    });
    // This function is going to be invoked asynchronously, so set some extra config for that
    new lambda.EventInvokeConfig(this, 'handleLoginCommandLambdaEventInvokeConfig', {
      function: handleLoginCommandLambda,
      maxEventAge: Duration.minutes(2),
      retryAttempts: 2,
    });
    // Give the slash command lambda permission to invoke this one
    handleLoginCommandLambda.grantInvoke(handleSlashCommandLambda);
    // Allow access to the relevant DynamoDB table
    props.stateTable.grantReadWriteData(handleLoginCommandLambda);
    handleLoginCommandLambda.addEnvironment('GITLAB_APPID', gitLabAppId);
    handleLoginCommandLambda.addEnvironment('GITLAB_CALLBACK_URL', gitLabCallbackUrl);
    handleLoginCommandLambda.addEnvironment('GITLAB_AUTHORIZE_URL', gitLabAuthorizeUrl);
    handleLoginCommandLambda.addEnvironment('GITLAB_SCOPES', gitLabScopes);

    // Create the lambda for handling the project webhook events
    const handleProjectHookEventLambda = new lambda.Function(this, "handleProjectHookEventLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("../lambda-src/dist/lambda.zip"),
      handler: "handleProjectHookEvent.handleProjectHookEvent",
      logRetention: logs.RetentionDays.THREE_DAYS,
      functionName: 'gitbot-handleProjectHookEvent',
      timeout: Duration.seconds(10)
    });
    // Allow access to the relevant DynamoDB tables
    props.projectConfigTable.grantReadData(handleProjectHookEventLambda);
    handleProjectHookEventLambda.addEnvironment('GITLAB_BOT_TOKEN', gitLabBotToken);

    // Create the lambda for handling pipeline events
    // It is called from the handleProjectHookEventLambda
    const handlePipelineEventLambda = new lambda.Function(this, "handlePipelineEventLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("../lambda-src/dist/lambda.zip"),
      handler: "handlePipelineEvent.handlePipelineEvent",
      logRetention: logs.RetentionDays.THREE_DAYS,
      functionName: 'gitbot-handlePipelineEvent',
      timeout: Duration.seconds(10)
    });
    // This function is going to be invoked asynchronously, so set some extra config for that
    new lambda.EventInvokeConfig(this, 'handlePipelineEventLambdaEventInvokeConfig', {
      function: handlePipelineEventLambda,
      maxEventAge: Duration.minutes(2),
      retryAttempts: 2,
    });
    // Give the handleProjectHookEventLambda permission to invoke this one
    handlePipelineEventLambda.grantInvoke(handleProjectHookEventLambda);
    // Allow access to the relevant DynamoDB tables
    props.userDataTable.grantReadWriteData(handlePipelineEventLambda);
    props.projectConfigTable.grantReadData(handlePipelineEventLambda);
    handlePipelineEventLambda.addEnvironment('SLACK_BOT_TOKEN', slackBotToken);
    handlePipelineEventLambda.addEnvironment('SLACK_SIGNING_SECRET', slackSigningSecret);
    handlePipelineEventLambda.addEnvironment('GITLAB_BOT_TOKEN', gitLabBotToken);
    
    // Create the lambda for handling the GitLab auth redirect
    const handleGitLabAuthRedirectLambda = new lambda.Function(this, "handleGitLabAuthRedirectLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("../lambda-src/dist/lambda.zip"),
      handler: "handleGitLabAuthRedirect.handleGitLabAuthRedirect",
      logRetention: logs.RetentionDays.THREE_DAYS,
      functionName: 'gitbot-handleGitLabAuthRedirect',
      timeout: Duration.seconds(10)
    });
    // Allow access to the relevant DynamoDB tables
    props.userDataTable.grantReadWriteData(handleGitLabAuthRedirectLambda);
    props.stateTable.grantReadWriteData(handleGitLabAuthRedirectLambda);
    // Add some env vars for getting GitLab tokens
    handleGitLabAuthRedirectLambda.addEnvironment('GITLAB_APPID', gitLabAppId);
    handleGitLabAuthRedirectLambda.addEnvironment('GITLAB_SECRET', gitLabSecret);
    handleGitLabAuthRedirectLambda.addEnvironment('GITLAB_CALLBACK_URL', gitLabCallbackUrl);
    
    // Get hold of the hosted zone which has previously been created
    const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'R53Zone', {
      zoneName: customDomainName,
      hostedZoneId: r53ZoneId,
    });

    // Create the cert for the gateway.
    // Usefully, this writes the DNS Validation CNAME records to the R53 zone,
    // which is great as normal Cloudformation doesn't do that.
    const acmCertificateForCustomDomain = new acm.DnsValidatedCertificate(this, 'CustomDomainCertificate', {
      domainName: gitlabApprovalsDomainName,
      hostedZone: zone,
      validation: acm.CertificateValidation.fromDns(zone),
    });

    // Create the custom domain
    const customDomain = new apigateway.DomainName(this, 'CustomDomainName', {
      domainName: gitlabApprovalsDomainName,
      certificate: acmCertificateForCustomDomain,
      endpointType: apigateway.EndpointType.REGIONAL,
      securityPolicy: apigateway.SecurityPolicy.TLS_1_2
    });

    // This is the API Gateway which then calls the initial response and auth redirect lambdas
    const api = new apigateway.RestApi(this, "APIGateway", {
      restApiName: "GitBot",
      description: "GitLab Slack integation",
      deploy: false // create the deployment below
    });

    // By default CDK creates a deployment and a "prod" stage.  That means the URL is something like
    // https://2z2ockh6g5.execute-api.eu-west-2.amazonaws.com/prod/
    // We want to create the stage to match the version id.
    const apiGatewayDeployment = new apigateway.Deployment(this, 'ApiGatewayDeployment', {
      api: api,
    });
    const stage = new apigateway.Stage(this, 'Stage', {
      deployment: apiGatewayDeployment,
      loggingLevel: apigateway.MethodLoggingLevel.INFO,
      dataTraceEnabled: true,
      stageName: lambdaVersionIdForURL
    });

    // Connect the API Gateway to the lambdas
    const handleProjectHookEventLambdaIntegration = new apigateway.LambdaIntegration(handleProjectHookEventLambda, {
      requestTemplates: {"application/json": '{ "statusCode": "200" }'}
    });
    const handleGitLabAuthRedirectLambdaIntegration = new apigateway.LambdaIntegration(handleGitLabAuthRedirectLambda, {
      requestTemplates: {"application/json": '{ "statusCode": "200" }'}
    });
    const handleSlashCommandLambdaIntegration = new apigateway.LambdaIntegration(handleSlashCommandLambda, {
      requestTemplates: {"application/json": '{ "statusCode": "200" }'}
    });
    const handleInteractiveEndpointLambdaIntegration = new apigateway.LambdaIntegration(handleInteractiveEndpointLambda, {
      requestTemplates: {"application/json": '{ "statusCode": "200" }'}
    });
    const handleProjectHookEventResource = api.root.addResource('projecthook-event');
    const handleGitLabAuthRedirectResource = api.root.addResource('gitlab-oauth-redirect');
    const handleSlashCommandResource = api.root.addResource('slash-command');
    const handleInteractiveEndpointResource = api.root.addResource('interactive-endpoint');
    // And add the methods.
    // TODO add authorizer lambda for the pipeline event lambda
    handleProjectHookEventResource.addMethod("POST", handleProjectHookEventLambdaIntegration);
    handleGitLabAuthRedirectResource.addMethod("GET", handleGitLabAuthRedirectLambdaIntegration);
    handleSlashCommandResource.addMethod("POST", handleSlashCommandLambdaIntegration);
    handleInteractiveEndpointResource.addMethod("POST", handleInteractiveEndpointLambdaIntegration);

    // Create the R53 "A" record to map from the custom domain to the actual API URL
    new route53.ARecord(this, 'CustomDomainAliasRecord', {
      recordName: gitlabApprovalsDomainName,
      zone: zone,
      target: route53.RecordTarget.fromAlias(new targets.ApiGatewayDomain(customDomain))
    });
    // And path mapping to the API
    customDomain.addBasePathMapping(api, {basePath: `${lambdaVersionIdForURL}`, stage: stage});
  }
}
