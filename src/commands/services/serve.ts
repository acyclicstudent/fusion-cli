import { join } from "path";
import { createPath } from "../../controllers/util/files";
import { requestServiceToUser, retrieveAvailableServices } from "./shared";
import { execSync } from 'child_process';
import express from 'express';
import { retrieveConfig } from "../../controllers/cli/config";
import { program } from "../../controllers/cli/program";

export const serve = async () => {
    retrieveConfig();

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
    console.log(res.toString());
    process.env.IS_LOCAL = '1';
    const { handler, HANDLERS } = require(join(path, 'build/index.js'));
    
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
    if (HANDLERS['GET']) {
        Object.keys(HANDLERS['GET']).forEach((route) => {
            app.get(
                route.replace(/\{/g, ':').replace(/\}/g, ''),
                adapter(route)
            )
        });
    }
    if (HANDLERS['POST']) {
        Object.keys(HANDLERS['POST']).forEach((route) => {
            app.post(
                route.replace(/\{/g, ':').replace(/\}/g, ''),
                adapter(route)
            )
        });
    }
    if (HANDLERS['DELETE']) {
        Object.keys(HANDLERS['DELETE']).forEach((route) => {
            app.delete(
                route.replace(/\{/g, ':').replace(/\}/g, ''),
                adapter(route)
            )
        });
    }
    if (HANDLERS['PATCH']) {
        Object.keys(HANDLERS['PATCH']).forEach((route) => {
            app.patch(
                route.replace(/\{/g, ':').replace(/\}/g, ''),
                adapter(route)
            )
        });
    }
    if (HANDLERS['PUT']) {
        Object.keys(HANDLERS['PUT']).forEach((route) => {
            app.put(
                route.replace(/\{/g, ':').replace(/\}/g, ''),
                adapter(route)
            )
        });
    }

    app.listen(opts.port || 4567, () => {
        console.log('Server on port: 4567')
    });
}