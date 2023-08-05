import {Stack} from 'aws-cdk-lib';
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
    const gitlabApprovalsDomainName = `gitbot.${customDomainName}`;
    // Semantic versioning has dots as separators but this is invalid in a URL
    // so replace the dots with underscores first.
    const lambdaVersionIdForURL = lambdaVersion.replace(/\./g, '_');

    // Create the lambda for handling the POST for pipeline events
    const handlePOSTPipelineEventLambda = new lambda.Function(this, "handlePOSTPipelineEventLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("../lambda-src/dist/lambda.zip"),
      handler: "handlePOSTPipelineEvent.lambdaHandler",
      logRetention: logs.RetentionDays.THREE_DAYS,
      functionName: 'handlePOSTPipelineEventLambda'
    });

    // Create the lambda for handling the GitLab auth redirect
    const handleGitLabAuthRedirectLambda = new lambda.Function(this, "handleGitLabAuthRedirectLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("../lambda-src/dist/lambda.zip"),
      handler: "handleGitLabAuthRedirect.lambdaHandler",
      logRetention: logs.RetentionDays.THREE_DAYS,
      functionName: 'handleGitLabAuthRedirectLambda'
    });
    // Allow access to the DynamoDB table
    props.slackIdToGitLabTokenTable.grantReadWriteData(handleGitLabAuthRedirectLambda);  
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

    // Connect the API Gateway to the initial response and auth redirect lambdas
    const handlePOSTPipelineEventLambdaIntegration = new apigateway.LambdaIntegration(handlePOSTPipelineEventLambda, {
      requestTemplates: {"application/json": '{ "statusCode": "200" }'}
    });
    const handleGitLabAuthRedirectLambdaIntegration = new apigateway.LambdaIntegration(handleGitLabAuthRedirectLambda, {
      requestTemplates: {"application/json": '{ "statusCode": "200" }'}
    });
    const handlePOSTPipelineEventResource = api.root.addResource('pipeline-event');
    const handleGitLabAuthRedirectResource = api.root.addResource('gitlab-oauth-redirect');
    // And add the methods.
    // TODO add authorizer lambda
    handlePOSTPipelineEventResource.addMethod("POST", handlePOSTPipelineEventLambdaIntegration);
    handleGitLabAuthRedirectResource.addMethod("GET", handleGitLabAuthRedirectLambdaIntegration);

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
