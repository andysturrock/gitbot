import {SlashCommandPayload} from './slackTypes';
import {createProjectHook, editProjectHook, getProjectDetailsById, getProjectDetailsByName, listProjectHooks} from './gitLabAPI';
import {ProjectConfig, putProjectConfig} from './projectConfigTable';
import {ProjectDetails, ProjectHookDetails} from './gitLabTypes';
import {postMarkdownAsBlocksToUrl} from './slackAPI';
import {getSecretValue} from './awsAPI';

/**
 * Handle the project argument of the slash command.
 * @param slashCommandPayload the payload from the original slash command
 * @returns void but posts the login message to Slack in response to the slash command.
 */
export async function handleProjectCommand(slashCommandPayload: SlashCommandPayload): Promise<void> {
  const gitLabBotToken = await getSecretValue('GitBot', 'gitLabBotToken');
  const gitBotUrl = await getSecretValue('GitBot', 'gitBotUrl');

  try {   
    let projectDetails: ProjectDetails[];
    if(slashCommandPayload.projectIdentifier) {
      let projectId = parseInt(slashCommandPayload.projectIdentifier);
      if(Number.isNaN(projectId)) {
        projectDetails = await getProjectDetailsByName(gitLabBotToken, slashCommandPayload.projectIdentifier);
        if(projectDetails.length == 0) {
          const text = `Can't find project with name "${slashCommandPayload.projectIdentifier}", please use project id instead`;
          await postMarkdownAsBlocksToUrl(slashCommandPayload.response_url, text, "Can't find project");
          return;
        }
        else if(projectDetails.length > 1) {
          const text = `Found more than one project with name "${slashCommandPayload.projectIdentifier}", please use project id instead`;
          await postMarkdownAsBlocksToUrl(slashCommandPayload.response_url, text, "Found more than one project");
          return;
        }
        projectId = projectDetails[0].id;
      }
      else {
        projectDetails = [await getProjectDetailsById(gitLabBotToken, projectId)];
      }
      let text = `Connecting project <${projectDetails[0].web_url}|${projectDetails[0].name} (id ${projectId})>...`;
      await postMarkdownAsBlocksToUrl(slashCommandPayload.response_url, text, "Connecting project...", true);

      const existingHooks = await listProjectHooks(gitLabBotToken, projectId);
      // Find any hooks that we have already created.
      const ourUrl = `${gitBotUrl}/projecthook-event`;
      const ourHooks = existingHooks.filter(hook => {
        return hook.url === ourUrl;
      });
      // Enable pipeline events for any existing hooks
      for(const hook of ourHooks) {
        hook.pipeline_events = true;
        await editProjectHook(gitLabBotToken, projectId, hook.id, hook);
      }
      // If there aren't any of our hooks then create a new one.
      if(ourHooks.length == 0) {
        const hook: ProjectHookDetails = {
          id: projectId,
          hook_id: 0, // not used in PUT
          project_id: projectId, // not used in PUT
          url: ourUrl,
          pipeline_events: true,
          push_events: false,
        };
        await createProjectHook(gitLabBotToken, projectId, hook);
      }

      // TODO currently only one channel per project.  In future might want different events in different channels.
      // Eg MR notifications in one channel and build notifications in another.
      // Save the mapping between the project and the Slack channel id.
      const projectConfig: ProjectConfig = {
        project_id: projectId,
        slack_channel_id: slashCommandPayload.channel_id
      };
      await putProjectConfig(projectId, projectConfig);

      text = `Project <${projectDetails[0].web_url}|${projectDetails[0].name} (id ${projectId}> successfully connected for blocked pipeline events.`;
      await postMarkdownAsBlocksToUrl(slashCommandPayload.response_url, text, "Project connected", true, true);
    }
    else {
      // We shouldn't have been called without the projectIdentifier being set.
      console.error("Logic error");
    }
  }
  catch (error) {
    console.error(error);
    await postMarkdownAsBlocksToUrl(slashCommandPayload.response_url, "Error connecting project - check logs", "Error connecting project");
  }
}
