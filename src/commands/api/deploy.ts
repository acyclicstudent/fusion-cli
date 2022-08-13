import fs from 'fs';
import fsa from 'fs-extra';
import { retrieveConfig } from '../../controllers/cli/config';
import childProcess from 'child_process';

export const deploy = async () => {
    const config = retrieveConfig();
    reset();
    const apiName = copyAPIFiles();
    uploadToS3(config);
    deployStack(config, apiName);
}

const reset = async () => {
    if (fs.existsSync(`${process.cwd()}\\api\\dist`)) {
        console.log('Removing dist');
        fsa.rmdirSync(`${process.cwd()}\\api\\dist`, { recursive: true });
    }
}

const copyAPIFiles = () => {
    if (!fs.existsSync(`${process.cwd()}\\api\\dist`)) {
        fs.mkdirSync(`${process.cwd()}\\api\\dist`);
    }
    const apiName = `schema-${Date.now()}.graphql`;
    fs.copyFileSync(
        `${process.cwd()}\\api\\schema.graphql`,
        `${process.cwd()}\\api\\dist\\${apiName}`
    );

    return apiName;
}


const uploadToS3 = (config: any) => {
    const syncCommand = `
        aws s3 sync 
        ${process.cwd()}\\api\\dist\\
        s3://${config.Project.DeploymentBucket}-${config.Project.Stage}/api --profile ${config.Project.AWSProfile}
        --delete
    `;

    const resultSync = childProcess.execSync(
        prepareCommand(syncCommand)
    );

    console.log(resultSync.toString());
}

const deployStack = (config: any, apiSchema: string) => {
    const { Project } = config;
    
    const command = `
        aws cloudformation deploy
        --region ${Project.Region} --profile ${config.Project.AWSProfile}
        --template-file ./stacks/${config.Project.API}
        --stack-name ${config.Project.Name}-backend-api-${config.Project.Stage}
        --parameter-overrides Project=${Project.Name} Stage=${Project.Stage} DeploymentBucket=${Project.DeploymentBucket} Schema=${apiSchema}
        --capabilities CAPABILITY_NAMED_IAM
    `;

    const result = childProcess.execSync(
        prepareCommand(command)
    );

    console.log(result.toString());
}

const prepareCommand = (command: string) => {
    return command.replace(/\n/g, '').replace(/\t/g, '').trim();
}