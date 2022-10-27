import { Command } from "commander";
import { create } from "./create";
import { deploy } from "./deploy";
import { install } from "./install";
import { updateFunction } from "./update-function";

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

        services.
        command('update-function')
        .description('Update function.')
        .action(updateFunction);

    services.
        command('install [package]')
        .description('Create a new service.')
        .action(install);
}