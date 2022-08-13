import path from 'path';

export const createPath = (fileOrDir: string) => {
    return path.join(
        process.cwd(),
        fileOrDir
    );
}

export const createInternalPath = (fileOrDir: string) => {
    return path.join(
        __dirname,
        fileOrDir
    );
}