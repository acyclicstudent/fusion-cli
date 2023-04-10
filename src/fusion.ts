#! /usr/bin/env node
import { registerInitCommand } from './commands/init';
import { registerAPICommand } from './commands/api';
import { registerServicesCommand } from './commands/services';
import { registerStacksCommand } from './commands/stacks';
import { program } from './controllers/cli/program';
import { registerAuthCommand } from './commands/auth';


// Main program.
const main = () => {
    // Set commands.
    registerInitCommand(program);
    registerAPICommand(program);
    registerServicesCommand(program);
    registerAuthCommand(program);
    registerStacksCommand(program);
    
    // Parse command line arguments
    program.option('--stage <stage>', 'stage to deploy');
    program.option('--port <port>', 'port for fusion serve');
    program.option('--service <service>', 'auto select service for fusion serve');
    program.option('--without-stack', 'Creates lambda without stack, only for function updates.')
    program.parse(process.argv);
}

main();