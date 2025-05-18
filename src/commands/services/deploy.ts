import fs from 'fs-extra';
import Chalk from 'chalk';
import childProcess from 'child_process';
import zip from 'bestzip';
import fsa from 'fs-extra';
import { requestServiceToUser, retrieveAvailableServices } from "./shared";
import { createPath } from '../../controllers/util/files';
import { retrieveConfig } from "../../controllers/cli/config";
import { LambdaClient, UpdateFunctionCodeCommand } from '@aws-sdk/client-lambda';
import { join } from "path";
import { workDir } from "../../controllers/cli/program";

export const deploy = async () => {
    let basePath: string = workDir;
    const isServiceDirectory = fs.existsSync(join(basePath, 'src/index.ts'));

    if (!isServiceDirectory) {
        const services = retrieveAvailableServices();
        if (!services.length)
            throw new Error('There are no services. Please create a new one and try again.');
        const selected = await requestServiceToUser(services);
        basePath = createPath('services/' + selected.service);
    }

    reset(basePath);

    await validateCode(basePath);
    await testCode(basePath);
    await buildCode(basePath);

    console.log(Chalk.yellow('Zipping...'));
    const funConfig = require(join(basePath, 'package.json'));
    const zipFile = await zipFiles(basePath, funConfig.name);

    const config = retrieveConfig();
    console.log(Chalk.yellow('Actualizando función...'));
    await update(basePath, zipFile, config, funConfig.name);
}

const runChildProcess = async (command: string, args: string[], options: any = {}) => {
    const result = childProcess.spawn(
        command,
        args,
        {
            shell: true,
            ...options
        }
    );

    result.stdout.on('data', (data) => {
        console.log(data.toString());
    });

    result.stderr.on('data', (data) => {
        const error = data.toString();
        if (error.includes('Error: Command failed:')) return;
        console.error(data.toString());
    });

    result.on('error', (error) => {
        console.log(Chalk.red('Error executing esbuild.'));
        console.error(error.message);
    });

    const code = await new Promise((resolve) => {
        result.on('close', (code) => {
            resolve(code);
        });
    });

    return code;
}

// Test code with jest.
const testCode = async (basePath: string) => {
    console.log(Chalk.yellow('Testing code...'));
    const testCommand = join(basePath,'node_modules/.bin/jest');
    const testResult = await runChildProcess(
        testCommand, 
        [
            '--coverage',
            '--silent',
        ],
        {
            cwd: basePath
        }
    );
    if (testResult !== 0) {
        console.log(Chalk.red('Testing failed with code: ' + testResult));
        process.exit(1);
    }
    console.log(Chalk.green('Testing completed successfully.'));
}

// Run 
const validateCode = async (basePath: string) => {
    // Run typechecking
    console.log(Chalk.yellow('Typechecking code...'));
    const typecheckCommand = join('.','node_modules/.bin/tsc');
    const typecheckResult = await runChildProcess(typecheckCommand, [
        '-p',
        `${join(basePath, 'tsconfig.json')}`,
        '--noEmit'
    ]);
    if (typecheckResult !== 0) {
        console.log(Chalk.red('Typechecking failed with code: ' + typecheckResult));
        process.exit(1);
    }
    console.log(Chalk.green('Typechecking completed successfully.'));
    
    // Run eslint.
    console.log(Chalk.yellow('Validate code rules...'));
    const codeLocation = join(basePath, 'src');
    const eslintCommand = join('.','node_modules/.bin/eslint');
    const eslintResult = await runChildProcess(eslintCommand, [
        `${join(codeLocation, '*')}`
    ]);
    if (eslintResult !== 0) {
        console.log(Chalk.red('ESLint failed with code: ' + eslintResult));
        process.exit(1);
    }
    console.log(Chalk.green('ESLint completed successfully.'));
}

const buildCode = async (basePath: string) => {
    console.log(Chalk.yellow('Bundling...'));
    const codeLocation = join(basePath, 'src');
    const distLocation = join(basePath, 'build');
    const esbuildCommand = join('.','node_modules/.bin/esbuild');

    const code = await runChildProcess(
        esbuildCommand,
        [
            `${join(codeLocation, '*')}`,
            '--bundle',
            '--minify',
            '--sourcemap',
            '--platform=node',
            '--target=node22',
            `--outdir=${distLocation}`,
            // '--analyze=verbose'
        ]
    );
    if (code !== 0) {
        console.log(Chalk.red('Bundling failed with code: ' + code));
        process.exit(1);
    }
    console.log(Chalk.green('Bundling completed with code: ' + code));
}

const zipFiles = async (basePath: string, funName: string) => {
    try {
        if (!fs.existsSync(join(basePath, 'dist'))) {
            fs.mkdirSync(join(basePath, 'dist'));
        }
        const zipFile = `${funName}-${Date.now()}.zip`;
        const zipParams = {
            cwd: join(basePath, 'build/'),
            source: `*`,
            destination: join(basePath, 'dist/' + zipFile)
        }
        await zip(zipParams);
    
        return zipFile;
    } catch (err: any) {
        console.log(Chalk.red('Failed to zip code.'));
        console.log(Chalk.red(err.message));
        process.exit(1);
    }
}

const update = async (basePath: string, zipFile: string, config: any, funName: string) => {
    try {
        const lambdaClient = new LambdaClient({
            region: config.Project.Region as string,
            profile: config.Project.AWSProfile as string
        });
    
        await lambdaClient.send(
            new UpdateFunctionCodeCommand({
                FunctionName: funName,
                ZipFile: fs.readFileSync(join(basePath, 'dist/' + zipFile)) as Uint8Array
            })
        );
        console.log(Chalk.green('Function updated successfully.'));
    } catch (err: any) {
        console.log(Chalk.red('Failed to update function.'));
        console.log(Chalk.red(err.message));
        process.exit(1);
    }
}

const reset = async (service: string) => {
    if (fs.existsSync(join(service, `dist`))) {
        fsa.rmSync(join(service, `dist`), { recursive: true });
    }
    if (fs.existsSync(join(service, `build`))) {
        fsa.rmSync(join(service, `build`), { recursive: true });
    }
}