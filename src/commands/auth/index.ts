import { Command } from "commander";
import { login } from "./login";

export const registerAuthCommand = (program: Command) => {
    const auth = program
        .command('auth')
        .description('Cognito Auth Utils.');

    // Add deployment subcommand 
    auth.
        command('login')
        .description('Login on user pool.')
        .action(login);
}