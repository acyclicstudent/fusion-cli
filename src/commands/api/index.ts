import { Command } from "commander";
import { deploy } from "./deploy";

export const registerAPICommand = (program: Command) => {
    const api = program
        .command('api')
        .description('GraphQL API management.');

    api
        .command('deploy')
        .description('Deploy an API')
        .action(deploy)
}