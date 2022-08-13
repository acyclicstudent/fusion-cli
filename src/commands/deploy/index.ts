import { Command } from "commander";

export const registerServicesCommand = (program: Command) => {
    const deploy = program
        .command('deploy');
}