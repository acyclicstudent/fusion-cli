import fs from 'fs-extra';
import { createInternalPath, createPath } from '../util/files';

export const copyTemplateStack = (template: string, newName: string) => {
    createStacksDir();

    if (fs.pathExistsSync(createPath(`stacks/${newName}`)))
            throw new Error('Stack name already exists');
    fs.copyFileSync(
        createInternalPath(`../../../assets/stacks/${template}`),
        createPath(`stacks/${newName}`)
    );

}

export const createStacksDir = () => {
    if (!fs.pathExistsSync(createPath('stacks')))
        fs.mkdirSync(createPath('stacks'));
} 