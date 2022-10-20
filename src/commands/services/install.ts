import { retrieveConfig } from "../../controllers/cli/config";
import { requestServiceToUser, retrieveAvailableServices } from "./shared";
import Chalk from 'chalk';
import { program } from "../../controllers/cli/program";
import childProcess from "child_process";
import { createPath } from "../../controllers/util/files";

export const install = async () => {
    retrieveConfig();
    const services = retrieveAvailableServices();
    if (!services.length)
        throw new Error('There are no services. Please create a new one and try again.');
    
    const selected = await requestServiceToUser(services); 
    console.log(Chalk.yellow('Installing...'));

    const isPackageInstallation = program.args.length > 2;
    
    if (!isPackageInstallation) {
        const result = childProcess.execSync(`cd ${createPath('services/' + selected.service)} && npm install`);
        console.log(result.toString('utf-8'));
    } else {
        const packages = [...program.args.slice(2, program.args.length)];
        console.log(packages);
        const packagesString = 
            packages.map((pkg) => {
                return /^[a-zA-Z0-9]|@|-|_|\/$/.test(pkg) ? pkg : '';
            })
            .join(' ');
        const result = childProcess.execSync(`cd ${createPath('services/' + selected.service)} && npm install ${packagesString}`);
        console.log(result.toString('utf-8'));
    }
}