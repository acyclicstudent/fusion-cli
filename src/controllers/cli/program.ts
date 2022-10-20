import { program as prog } from 'commander';

export const program = prog;

export let workDir = process.cwd();

export const updateWorkDir = (newWorkDir: string) => {
    workDir = newWorkDir;
}