import inquirer from "inquirer";
import { retrieveConfig } from "../../controllers/cli/config"

export const login = async () => {
    try {
        const config = retrieveConfig();
        const result = await requestUserPool(config);

        // Config credentials environment.
        process.env.AWS_PROFILE = config.Project.AWSProfile;
        process.env.AWS_REGION = config.Project.Region;

        const { default: CognitoIdp } = await import('aws-sdk/clients/cognitoidentityserviceprovider');
        const cognito = new CognitoIdp();

        const credentials = await requestCredentials();

        const tokens = await cognito.adminInitiateAuth({
            UserPoolId: result.userPool.Pool,
            AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
            ClientId: result.userPool.Client,
            AuthParameters: {
                'USERNAME': credentials.username,
                'PASSWORD': credentials.password,
            }
        }).promise();

        console.log(tokens);
    } catch (err) {
        console.log(err);
    }
}

export const requestCredentials = () =>{
    return inquirer.prompt([
        {
            name: 'username',
            type: 'input',
            message: 'Username: '
        },
        {
            name: 'password',
            type: 'password',
            message: 'Password: '
        }
    ]);
}

export const requestUserPool = (config: any) =>{
    return inquirer.prompt({
        name: 'userPool',
        type: 'list',
        message: 'Select user pool: ',
        choices: config.Auth.UserPools.map((userPool: any) => ({
            name: userPool.Name,
            value: {
                Pool: userPool.Pool,
                Client: userPool.Client
            }
        }))
    });
}