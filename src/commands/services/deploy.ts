import { createPath } from "../../controllers/util/files";
import fs from 'fs-extra';
import inquirer from "inquirer";
import Chalk from 'chalk';
import childProcess from 'child_process';
import zip from 'bestzip';
import fsa from 'fs-extra';
import { retrieveConfig } from "../../controllers/cli/config";

export const deploy = async () => {
    const services = retrieveAvailableServices();
    if (!services.length)
        throw new Error('There are no services. Please create a new one and try again.');
    
    const selected = await requestServiceToUser(services); 
    console.log(Chalk.yellow('Deploying stack...'));
    reset(selected.service);
    buildCode(selected.service);
    copyPackage(selected.service);
    installDependencies(selected.service);
    const zipFile = await zipFiles(selected.service);
    const config = retrieveConfig();
    uploadToS3(selected.service, config);
    deployStack(config, selected.service, zipFile);
}

export const retrieveAvailableServices = () =>{
    return fs.readdirSync(createPath('services'));
}

export const requestServiceToUser = (services: string[]) => {
    return inquirer.prompt({
        name: 'service',
        type: 'list',
        message: 'Service to deploy: ',
        choices: services.map(service => ({
            name: service,
            value: service
        }))
    });
}

const buildCode = (service: string) => {
    const command = `
        cd ${process.cwd()}/services/${service} && tsc
    `;
    console.log('Running build...', command);
    const result = childProcess.execSync(
        prepareCommand(command)
    ).toString();
    console.log(result);
}

const copyPackage = (service: string) => {
    fs.copyFileSync(
        `${process.cwd()}\\services\\${service}\\package.json`,
        `${process.cwd()}\\services\\${service}\\build\\package.json`,
    );
}

const installDependencies = (service: string) => {
    const command = `
        cd ${process.cwd()}/services/${service}/build && npm install --only=prod
    `;
    console.log('Running install...', command);
    const result = childProcess.execSync(
        prepareCommand(command)
    ).toString();
    console.log(result);
}

const zipFiles = async (service: string) => {
    if (!fs.existsSync(`${process.cwd()}\\services\\${service}\\dist`)) {
        fs.mkdirSync(`${process.cwd()}\\services\\${service}\\dist`);
    }
    const zipFile = `${service}-${Date.now()}.zip`;
    await zip({
        cwd: `${process.cwd()}\\services\\${service}\\build\\`,
        source: `*`,
        destination: `..\\dist\\${zipFile}`
    });

    return zipFile;
}

const reset = async (service: string) => {
    if (fs.existsSync(`${process.cwd()}\\services\\${service}\\dist`)) {
        console.log('Removing dist');
        fsa.rmdirSync(`${process.cwd()}\\services\\${service}\\dist`, { recursive: true });
    }
    if (fs.existsSync(`${process.cwd()}\\services\\${service}\\build`)) {
        console.log('Removing build');
        fsa.rmdirSync(`${process.cwd()}\\services\\${service}\\build`, { recursive: true });
    }
}

const uploadToS3 = (service: string, config: any) => {
    const syncCommand = `
        aws s3 sync 
        ${process.cwd()}\\services\\${service}\\dist\\
        s3://${config.Project.DeploymentBucket}-${config.Project.Stage}/services/${service} --profile ${config.Project.AWSProfile}
        --delete
    `;

    const resultSync = childProcess.execSync(
        prepareCommand(syncCommand)
    );

    console.log(resultSync.toString());
}

const deployStack = (config: any, service: string, zipFile: string) => {
    const { Project } = config;

    const command = `
        aws cloudformation deploy
        --region ${Project.Region} --profile ${config.Project.AWSProfile}
        --template-file ./services/${service}/service.yml
        --stack-name ${config.Project.Name}-backend-${service}-${config.Project.Stage}
        --parameter-overrides Project=${Project.Name} Stage=${Project.Stage} DeploymentBucket=${Project.DeploymentBucket} S3Key=${service}/${zipFile} Name=${service}
        --capabilities CAPABILITY_NAMED_IAM
    `;

    const result = childProcess.execSync(
        prepareCommand(command)
    );

    console.log(result.toString());
}

const prepareCommand = (command: string) => {
    return command.replace(/\n/g, '').replace(/\t/g, '').trim();
}