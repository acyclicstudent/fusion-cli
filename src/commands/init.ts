import { Command } from "commander";
import inquirer from 'inquirer';
import fs from 'fs-extra';
import yaml from 'yaml';
import Chalk from 'chalk';
import { copyTemplateStack } from "../controllers/stacks/copy-stack";
import { createPath } from "../controllers/util/files";

export const registerInitCommand = (program: Command) => {
    program
        .command('init')
        .description('Initialize new project')
        .action(handleInit);
}

export const handleInit = async () => {
    try {
        const config = await requestProjectConfig();
        console.log(Chalk.yellow('Configuring project...'));
        
        const configFile = `${process.cwd()}/fusion.yml`;
        // Check if already exists a fusion config file.
        if (fs.existsSync(configFile)) throw new Error(`${configFile} already exists.`);
    
        fs.writeFileSync(
            configFile,
            yaml.stringify({
                Project: {
                    Name: config.project || 'unknown',
                    Region: config.region || 'us-west-2',
                    AWSProfile: config.profile || 'default',
                    DeploymentBucket: config.bucket || `${config.project}-deployment-bucket`
                }
            })
        );

        console.log(Chalk.yellow('Creating deployment bucket stack...'));
        copyTemplateStack('deployment-bucket.yml', config.project + '-deployment-bucket.yml');
        
        console.log(Chalk.yellow('Creating git ignore...'));
        fs.writeFileSync(createPath('.gitignore'), '**/node_modules\n**/dist\n**/build\n**/package-lock.json');
        
        console.log(Chalk.green(`Project configurated.\nPlease deploy the stack ${config.project}-deployment-bucket.yml using 'fusion stacks deploy'.`));
    } catch (err) {
        console.log(Chalk.red('Error: ', (err as Error).message));
    }
}

export const requestProjectConfig = async () => {
    return inquirer.prompt([
        {
            name: 'project',
            message: 'Project Name: '
        },
        {
            name: 'region',
            message: 'Default AWS Region: ',
            default: 'us-west-2'
        },
        {
            name: 'profile',
            message: 'AWS Profile: ',
            default: 'default'
        },
        {
            name: 'bucket',
            message: 'Deployment Bucket: '
        },
    ]);
}