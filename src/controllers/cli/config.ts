import fs from 'fs-extra';
import yaml from 'yaml';
import path from 'path';
import { program, updateWorkDir } from './program';

export const retrieveConfig = () => {
    try {
        let currentDirectory = process.cwd();
        
        // Check if exists in current directory
        let isFound = false;
        let configFile = path.join(currentDirectory, './fusion.yml');

        if (!fs.existsSync(configFile)) {
            let back = '../'; 
            do {
                const current = path.join(currentDirectory, `${back}fusion.yml`);
                if (current === configFile) throw new Error('Not found.');
                if (fs.existsSync(configFile)) {
                    break;
                }
                configFile = current;
                back += '../';
            } while(true);
        } else {
            // Si se encuentra, prosigue.
            isFound = true;
        }
    
        updateWorkDir(configFile.replace('/fusion.yml', ''));

        return yaml.parse(
            fs
                .readFileSync(configFile)
                .toString()
        );
    } catch (e) {
        throw new Error('Project configuration file not found, please run "fusion init" first.');
    }
}

export const retrieveStage = () => {
    const opts = program.opts();
    return opts.stage || 'dev';
}