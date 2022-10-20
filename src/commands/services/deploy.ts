import fs from 'fs-extra';
import Chalk from 'chalk';
import childProcess from 'child_process';
import zip from 'bestzip';
import fsa from 'fs-extra';
import { retrieveConfig, retrieveStage } from "../../controllers/cli/config";
import { requestServiceToUser, retrieveAvailableServices } from "./shared";
import { createPath } from '../../controllers/util/files';

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





const buildCode = (service: string) => {
    const command = `
        cd ${createPath('services/' + service + '&& tsc')} 
    `;
    console.log('Running build...', command);
    const result = childProcess.execSync(
        prepareCommand(command)
    ).toString();
    console.log(result);
}

const copyPackage = (service: string) => {
    fs.copyFileSync(
        createPath(`services/${service}/package.json`),
        createPath(`services/${service}/build/package.json`),
    );
}

const installDependencies = (service: string) => {
    const command = `
        cd ${createPath('services/' + service + '/build && npm install --production')}
    `;
    console.log('Running install...', command);
    const result = childProcess.execSync(
        prepareCommand(command)
    ).toString();
    console.log(result);
}

const zipFiles = async (service: string) => {
    if (!fs.existsSync(createPath(`services/${service}/dist`))) {
        fs.mkdirSync(createPath(`services/${service}/dist`));
    }
    const zipFile = `${service}-${Date.now()}.zip`;
    await zip({
        cwd: createPath(`services/${service}/build/`),
        source: `*`,
        destination: createPath(`../dist/${zipFile}`)
    });

    return zipFile;
}

const reset = async (service: string) => {
    if (fs.existsSync(createPath(`services/${service}/dist`))) {
        console.log('Removing dist');
        fsa.rmdirSync(createPath(`services/${service}/dist`), { recursive: true });
    }
    if (fs.existsSync(createPath(`services/${service}/build`))) {
        console.log('Removing build');
        fsa.rmdirSync(createPath(`services/${service}/build`), { recursive: true });
    }
}

const uploadToS3 = (service: string, config: any) => {
    const syncCommand = `
        aws s3 sync 
        ${createPath('services/' + service + '/dist/')}
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
    const params = Object.keys(config.Parameters || {})
        .map((param) => 
            `${param}=${config.Parameters[param].replace('{Fusion::Project}', Project.Name).replace('{Fusion::Stage}', retrieveStage())}`
        )
        .join(' ');


    const command = `
        aws cloudformation deploy
        --region ${Project.Region} --profile ${config.Project.AWSProfile}
        --template-file ${createPath('./services/' + service + '/service.yml')}
        --stack-name ${config.Project.Name}-backend-${service}-${retrieveStage()}
        --parameter-overrides Project=${Project.Name} Stage=${retrieveStage()} DeploymentBucket=${Project.DeploymentBucket} S3Key=${service}/${zipFile} Name=${service} ${params}
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