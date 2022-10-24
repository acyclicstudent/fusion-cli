import Chalk from 'chalk';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import { retrieveConfig, retrieveStage } from '../../controllers/cli/config';
import { createPath } from '../../controllers/util/files';
import childProcess from 'child_process';

export const deploy = async () => {
    try {
        const stacks = retrieveAvailableStacks();
        if (!stacks.length)
            throw new Error('There are no stacks. Please create a new one and try again.');
        
        const selectedStack = await requestStackToUser(stacks); 
        console.log(Chalk.yellow('Deploying stack...'));
        deployStack({
            stack: selectedStack.stack,
            stackName: retrieveStackName(selectedStack.stack),
            config: retrieveConfig()
        });
    } catch (err) {
        console.log(Chalk.red('Error: ', (err as Error).message));
    }
}

export const retrieveAvailableStacks = () =>{
    return fs.readdirSync(createPath('stacks'));
}

export const requestStackToUser = (stacks: string[]) => {
    return inquirer.prompt({
        name: 'stack',
        type: 'list',
        message: 'Stack to deploy: ',
        choices: stacks.map(stack => ({
            name: stack,
            value: stack
        }))
    });
}

const retrieveStackName = (stack: string) => {
    const stackNameArray = stack.split('-');
    stackNameArray.shift();
    return stackNameArray.join('-').replace('.yml', '');
}

export interface DeployArgs {
    stack: string;
    stackName: string;
    config: any;
}
const deployStack = (args: DeployArgs) => {
    const { Project } = args.config;
    const params = Object.keys(args.config.Parameters || {})
        .map((param) => 
            `${param}=${args.config.Parameters[param].replace('{Fusion::Project}', Project.Name).replace('{Fusion::Stage}', retrieveStage())}`
        )
        .join(' ');

    const command = `
        aws cloudformation deploy
        --region ${Project.Region} --profile ${Project.AWSProfile}
        --template-file ${createPath('./stacks/' + args.stack)}
        --stack-name ${Project.Name}-backend-${args.stackName}-${retrieveStage()}
        --parameter-overrides Project=${Project.Name} Stage=${retrieveStage()} DeploymentBucket=${Project.DeploymentBucket} ${params}
        --capabilities CAPABILITY_NAMED_IAM
    `;

    const result = childProcess.execSync(
        command.replace(/\n/g, '').replace(/\t/g, '').trim()
    );
    console.log(result.toString())
}