import inquirer from "inquirer";

export const getServiceType = async () => {
    return inquirer.prompt({
        type: 'list',
        name: 'type',
        message: 'Choose a Service Type: ',
        choices: [
            {
                name: 'GraphQL Resolvers Handler',
                value: 'graphql',
            },
            {
                name: 'API GATEWAY Handler',
                value: 'rest',  
            },
            {
                name: 'SQS Handler',
                value: 'sqs'
            },
            {
                name: 'S3 Event Handler',
                value: 's3'
            }
        ]
    });
}

export const requestStackCreationOptions = async () => {
    return inquirer.prompt([
        {
            type: 'list',
            name: 'type',
            message: 'Choose a Stack Type: ',
            choices: [
                {
                    name: 'WEB SPA DISTRIBUTION (S3 + CloudFront)',
                    value: 'web',
                },
                {
                    name: 'S3 BUCKET',
                    value: 's3',  
                },
                // {
                //     name: 'SQS',
                //     value: 'sqs',  
                // },
                // {
                //     name: 'FIFO SQS',
                //     value: 'sqs-fifo',  
                // },
                {
                    name: 'DYNAMODB',
                    value: 'dynamo',  
                },
                {
                    name: 'COGNITO AUTH',
                    value: 'auth'
                },
                // {
                //     name: 'VOD',
                //     value: 'vod'
                // },
                // {
                //     name: 'VOD MANIFEST AUTH',
                //     value: 'vod-manifest'
                // },
                // {
                //     name: 'API GATEWAY',
                //     value: 'api-gateway'
                // },
                {
                    name: 'IAM PERMISSIONS',
                    value: 'permissions'
                },
                // {
                //     name: 'EVENT BRIDGE TRIGGER',
                //     value: 'event-bridge-trigger'
                // },
            ]
        },
        {
            name: 'name',
            message: 'New stack name: '
        }    
    ]);
}