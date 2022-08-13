import { Command } from "commander";
import { create } from "./create";
import { deploy } from "./deploy";

export const registerServicesCommand = (program: Command) => {
    const services = program
        .command('services')
        .description('Serverless services management.');

        // Add deployment subcommand 
    services.
        command('deploy')
        .description('Deploy a service.')
        .action(deploy);
        
    // Add new subcommand.
    services.
        command('create')
        .description('Create a new service.')
        .action(create);
}