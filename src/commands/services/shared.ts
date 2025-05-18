import fs from 'fs-extra';
import { createPath } from '../../controllers/util/files';
import inquirer from "inquirer";

export const retrieveAvailableServices = () =>{
    if (!fs.existsSync(createPath('services')))
        return [];
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