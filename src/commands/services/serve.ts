import { join } from "path";
import { createPath } from "../../controllers/util/files";
import { requestServiceToUser, retrieveAvailableServices } from "./shared";
import { execSync } from 'child_process';
import express from 'express';
import { retrieveConfig } from "../../controllers/cli/config";
import { program } from "../../controllers/cli/program";
import { config as configEnv } from 'dotenv';
import { existsSync } from "fs-extra";

export const serve = async () => {
    const config = retrieveConfig();

    const opts = program.opts();
    
    let selectedService: string = opts.service || '';
    if (!/^([a-zA-Z0-9]|-|_)+$/.test(selectedService)) {
        return console.error('Invalid service');
    }
    if (!opts.service) {
        const services = retrieveAvailableServices();
        if (!services.length)
            throw new Error('There are no services. Please create a new one and try again.');
        const selected = await requestServiceToUser(services); 
        selectedService = selected.service;
    }

    const path = createPath('services/'+selectedService);
    console.log('Compiling: ', path)
    const res = execSync(`cd ${path} && tsc`);

    // Load default variables.
    process.env.AWS_REGION = config.Project.Region;
    process.env.AWS_PROFILE = config.Project.AWSProfile;

    // Load env.
    const envPath = join(path, '.env'); 
    if (existsSync(envPath)) {
        console.log('Detected .env, loading...');
        configEnv({ path: envPath });
    }
    console.log(res.toString());
    process.env.IS_LOCAL = '1';
    const { handler, app: fusionApp } = require(join(path, 'build/index.js'));
    const app = express();
    app.use(express.json());
    const adapter = (path: string) => async (req: express.Request, res: express.Response) => {
        try {
            const response = await handler(
                {
                    resource: path,
                    httpMethod: req.method.toUpperCase(),
                    pathParameters: req.params,
                    headers: req.headers,
                    body: JSON.stringify(req.body),
                    queryStringParameters: req.query,
                    requestContext: {
                        authorizer: {}
                    }
                },
                {
                    invokedFunctionArn: 'function:dev'
                }
            );
            Object.keys(response.headers).forEach((key) => {
                res.setHeader(key, response.headers[key]);
            });
            res
                .status(response.statusCode)
                .send(response.body);
        } catch (err) {
            console.error(err);
            res.status(500).json({
                message: 'Internal Server Error'
            })
        }
    } 

    const adapterListeners = (event: string) => async (req: express.Request, res: express.Response) => {
        try {
            const response = await handler(
                {
                    event,
                    payload: req.body
                },
                {
                    invokedFunctionArn: 'function:dev'
                }
            );
            res
                .status(200)
                .send(response);
        } catch (err) {
            console.error(err);
            res.status(500).json({
                message: 'Internal Server Error'
            })
        }
    } 

    if (fusionApp['GET']) {
        Object.keys(fusionApp['GET']).forEach((route) => {
            console.log(`GET ${route}: LOADED.`)
            app.get(
                route.replace(/\{/g, ':').replace(/\}/g, ''),
                adapter(route)
            )
        });
    }
    if (fusionApp['POST']) {
        Object.keys(fusionApp['POST']).forEach((route) => {
            console.log(`POST ${route}: LOADED.`)
            app.post(
                route.replace(/\{/g, ':').replace(/\}/g, ''),
                adapter(route)
            )
        });
    }
    if (fusionApp['DELETE']) {
        Object.keys(fusionApp['DELETE']).forEach((route) => {
            console.log(`DELETE ${route}: LOADED.`)
            app.delete(
                route.replace(/\{/g, ':').replace(/\}/g, ''),
                adapter(route)
            )
        });
    }
    if (fusionApp['PATCH']) {
        Object.keys(fusionApp['PATCH']).forEach((route) => {
            console.log(`PATCH ${route}: LOADED.`)
            app.patch(
                route.replace(/\{/g, ':').replace(/\}/g, ''),
                adapter(route)
            )
        });
    }
    if (fusionApp['PUT']) {
        Object.keys(fusionApp['PUT']).forEach((route) => {
            console.log(`PUT ${route}: LOADED.`)
            app.put(
                route.replace(/\{/g, ':').replace(/\}/g, ''),
                adapter(route)
            )
        });
    }

    // Register event listeners for testing.
    if (fusionApp['listeners']) {
        Object.keys(fusionApp['listeners']).forEach((event) => {
            console.log(`LISTENER ${event}: LOADED on POST /fusion-listeners/${event}`);
            app.post(`/fusion-listeners/${event}`, adapterListeners(event));
        })
    }

    const port = opts.port || 4567;
    app.listen(port, () => {
        console.log('Server started on port: ' + port);
    });
}