import Chalk from 'chalk';
import { retrieveConfig } from '../../controllers/cli/config';
import { getServiceType } from "../../controllers/util/prompts";
import fs from 'fs-extra';
import { createInternalPath, createPath } from '../../controllers/util/files';
import inquirer from 'inquirer';
import childProcess from 'child_process';
import { program } from '../../controllers/cli/program';

export const create = async () => {
    try {
        const config = retrieveConfig();
        const result = await getServiceType();
        const opts = program.opts();

        // Create service folder if not exists.
        createServicesDir();

        // Request service name for user.
        const promptResult = await inquirer.prompt([
            {
                name: 'name',
                message: 'Service Name: ',
            }
        ]);

        // Check if service name exists.
        const serviceName = `${config.Project.Name}-service-${promptResult.name}`;
        if (fs.pathExistsSync(createPath(`services/${serviceName}`)))
            throw new Error('Service name already exists');

        // Create service folder.
        fs.mkdirSync(createPath(`services/${serviceName}`));
        copyTemplate(serviceName, result.type);

        if (opts.withoutStack) {
            // Se elimina el stack.
            fs.rm(createPath(`services/${serviceName}/service.yml`));
        }

        const install = childProcess.execSync(`cd ${createPath('services/' + serviceName)} && npm install`);
        console.log(install.toString('utf-8'));

        console.log(
            Chalk.green(
                `
                    Service "${serviceName}" created in services/${serviceName}.\n\nYou can use "fusion services deploy" to deploy it.
                `.trim()
            )
        );
    } catch (err) {
        console.log(Chalk.red('Error: ', (err as Error).message));
    }
}

export const createServicesDir = () => {
    if (!fs.pathExistsSync(createPath('services')))
        fs.mkdirSync(createPath('services'));
} 

export const copyTemplate = (serviceName: string, template: string) => {
    fs.mkdirSync(
        createPath(`services/${serviceName}/src`),
        { recursive: true }
    );

    // Copy template files.
    fs.copyFileSync(
        createInternalPath(`../../../assets/templates/services/${template}/service.yml`),
        createPath(`services/${serviceName}/service.yml`)
    );
    fs.copyFileSync(
        createInternalPath(`../../../assets/templates/services/${template}/tsconfig.json`),
        createPath(`services/${serviceName}/tsconfig.json`)
    );
    fs.copyFileSync(
        createInternalPath(`../../../assets/templates/services/${template}/src/index.ts`),
        createPath(`services/${serviceName}/src/index.ts`)
    );
    const packageJSON = require(
        createInternalPath(`../../../assets/templates/services/${template}/package.json`)
    );
    packageJSON.name = serviceName;
    fs.writeFileSync(
        createPath(`services/${serviceName}/package.json`),
        JSON.stringify(packageJSON, null, 4)
    );

    // NPM install
    const serviceDir = createPath(`services/${serviceName}/`)
    childProcess.spawnSync(`cd ${serviceDir} && npm install`);
}