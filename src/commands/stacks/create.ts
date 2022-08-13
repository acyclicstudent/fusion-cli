import Chalk from 'chalk';
import { retrieveConfig } from '../../controllers/cli/config';
import { copyTemplateStack } from '../../controllers/stacks/copy-stack';
import { requestStackCreationOptions } from '../../controllers/util/prompts';

export const create = async () => {
    try {
        // Load config.
        const config = await retrieveConfig();

        // Request option to user.
        const { type, name } = await requestStackCreationOptions();
        
        copyTemplateStack(`${type}.yml`, `${config.Project.Name}-${name}.yml`);
        
        console.log(Chalk.green('Stack created successfully.'));
    } catch (err) {
        console.log(Chalk.red('Error: ', (err as Error).message));
    }
}

