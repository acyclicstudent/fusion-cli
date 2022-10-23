import { APIGatewayEvent, Context } from "aws-lambda";

export const handler = async (event: APIGatewayEvent, context: Context) => {
    try { 
        console.log(event);
    
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(
                await HANDLERS[event.httpMethod][event.resource](event, context)
            )
        }
    } catch (err) {
        console.error(err);
        return {
            statusCode: err.code || 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(
                {
                    message: err.message
                }
            )
        }
    }
}

const HANDLERS: any = {
    'GET': {},
    'POST': {},
    'PUT': {},
    'PATCH': {},
    'DELETE': {},
}