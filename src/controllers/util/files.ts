import path from 'path';
import { workDir } from '../cli/program';

export const createPath = (fileOrDir: string) => {
    return path.join(
        workDir,
        fileOrDir
    );
}

export const createInternalPath = (fileOrDir: string) => {
    return path.join(
        __dirname,
        fileOrDir
    );
}