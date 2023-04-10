/**
 * Actualiza una función sin CloudFormation.
 */

import fs from 'fs-extra';
import Chalk from 'chalk';
import childProcess from 'child_process';
import zip from 'bestzip';
import fsa from 'fs-extra';
import { retrieveConfig, retrieveStage } from "../../controllers/cli/config";
import { requestServiceToUser, retrieveAvailableServices } from "./shared";
import { createPath } from '../../controllers/util/files';

export const updateFunction = async () => {
    const services = retrieveAvailableServices();
    if (!services.length)
        throw new Error('There are no services. Please create a new one and try again.');
    
    const selected = await requestServiceToUser(services); 
    reset(selected.service);
    console.log(Chalk.yellow('Building...'));
    buildCode(selected.service);
    copyPackage(selected.service);
    console.log(Chalk.yellow('Installing dependencies...'));
    installDependencies(selected.service);
    console.log(Chalk.yellow('Zipping...'));
    const zipFile = await zipFiles(selected.service);
    const config = retrieveConfig();
    console.log(Chalk.yellow('Actualizando función...'));
    update(selected.service, zipFile, config);
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
        destination: createPath(`services/${service}/dist/${zipFile}`)
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

const update = (service: string, zipFile: string, config: any) => {
    const funConfig = require(createPath('services/' + service + '/package.json'));

    const syncCommand = `
        aws lambda update-function-code 
        --function-name ${funConfig.name}
        --zip-file fileb://${createPath('services/' + service + '/dist/' + zipFile).replace(/([A-Za-z]:)/g, '').replace(/\\/g, '/')}
        --profile ${config.Project.AWSProfile}
    `;

    const resultSync = childProcess.execSync(
        prepareCommand(syncCommand)
    );

    console.log(resultSync.toString());
}

const prepareCommand = (command: string) => {
    return command.replace(/\n/g, '').replace(/\t/g, '').trim();
}