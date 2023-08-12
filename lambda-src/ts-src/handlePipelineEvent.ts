import * as util from 'util';
import {PipelineEvent} from './gitLabTypes';
import {handleBlockedPipeline} from './handleBlockedPipeline';

export async function handlePipelineEvent(pipelineEvent: PipelineEvent): Promise<void> {
  try {
    // Builds are listed in reverse order (ie latest stage first) in the JSON.
    // TODO shouldn't rely on ordering as the JSON spec says it's an unordered set of key/value pairs.
    // So we should iterate over all the builds to find one where the stage is deploy and the status is manual.
    const stage = pipelineEvent.builds[0].stage;
    const status = pipelineEvent.builds[0].status;
    if(stage.match(/^deploy/) && status == "manual") {
      await handleBlockedPipeline(pipelineEvent);
    }
  }
  catch (error) {
    console.error(`Caught error: ${util.inspect(error)}`);
  }
}
