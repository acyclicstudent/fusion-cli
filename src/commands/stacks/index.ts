import { Command } from "commander";
import { create } from "./create";
import { deploy } from "./deploy";

export const registerStacksCommand = (program: Command) => {
    const stacks = program
        .command('stacks')
        .description('Stacks management.');

    // Add new subcommand.
    stacks.
        command('create')
        .description('Create a new Stack.')
        .action(create);

    stacks
        .command('deploy')
        .description('Deploy a Stack')
        .action(deploy)
}