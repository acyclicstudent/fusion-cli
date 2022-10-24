import fs from 'fs';
import fsa from 'fs-extra';
import { retrieveConfig, retrieveStage } from '../../controllers/cli/config';
import childProcess from 'child_process';
import { createPath } from '../../controllers/util/files';

export const deploy = async () => {
    const config = retrieveConfig();
    reset();
    console.log('Copying API to dist directory.')
    const apiName = copyAPIFiles();
    uploadToS3(config);
    deployStack(config, apiName);
}

const reset = async () => {
    if (fs.existsSync(createPath('/api/dist'))) {
        console.log('Removing dist');
        fsa.rmdirSync(createPath('/api/dist'), { recursive: true });
    }
}

const copyAPIFiles = () => {
    if (!fs.existsSync(createPath('/api/dist'))) {
        fs.mkdirSync(createPath('/api/dist'));
    }
    const apiName = `schema-${Date.now()}.graphql`;
    fs.copyFileSync(
        createPath('/api/schema.graphql'),
        createPath(`/api/dist/${apiName}`)
    );

    return apiName;
}


const uploadToS3 = (config: any) => {
    const syncCommand = `
        aws s3 sync 
        ${createPath('/api/dist/')}
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
    const params = Object.keys(config.Parameters || {})
        .map((param) => 
            `${param}=${config.Parameters[param].replace('{Fusion::Project}', Project.Name).replace('{Fusion::Stage}', retrieveStage())}`
        )
        .join(' ');

    const command = `
        aws cloudformation deploy
        --region ${Project.Region} --profile ${config.Project.AWSProfile}
        --template-file ${createPath('./stacks/' + config.Project.API)}
        --stack-name ${config.Project.Name}-backend-api-${retrieveStage()}
        --parameter-overrides Project=${Project.Name} Stage=${retrieveStage()} DeploymentBucket=${Project.DeploymentBucket} Schema=${apiSchema} ${params}
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