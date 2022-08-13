import fs from 'fs-extra';
import yaml from 'yaml';
import { program } from './program';

export const retrieveConfig = () => {
    try {
        const opts = program.opts();
        console.log(opts);
        return yaml.parse(
            fs
                .readFileSync(`${process.cwd()}/fusion.${opts.stage || 'dev'}.yml`)
                .toString()
        );
    } catch (e) {
        throw new Error('Project configuration file not found, please run "fusion init" first.');
    }
}