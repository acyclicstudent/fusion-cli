import { SQSEvent, SQSRecord } from "aws-lambda";
import SQS from 'aws-sdk/clients/sqs';
import { handleRecord } from "./handler";
import { sqs } from "./services";

export const handler = async (event: SQSEvent) => {
    console.log(`::: Processing event with ${event.Records.length} records :::`);
    console.log(process.env.QUEUE)
    
    // Group messages by group id.
    const messages = {};
    for (const record of event.Records) {
        const messageId = record.attributes.MessageGroupId;
        if (!messages[messageId]) {
            messages[messageId] = [];
        }
        messages[messageId].push(record);
    }

    // Processing each message in order.
    const messageGroups = Object.keys(messages);
    console.log(`Message groups: ${messageGroups.toString()}`);
    const messageGroupsCount = messageGroups.length;
    const promises = [];
    for (let i = 0; i < messageGroupsCount; i++) {
        console.log(`Processing message group ${i}/${messageGroupsCount}`);
        // For each message Group process in parallel.
        promises.push((async () => {
            // last deleted
            let lastDeletedIndex = -1;
            try {
                // Process all messages in parallel
                for (const record of messages[messageGroups[i]]) {
                    console.log(`[ServicePaymentsProcessing]: Processing message ${record.messageId}`);
                    
                    await handleRecord(record as SQSRecord);
                    
                    // Delete processed message.
                    await sqs.deleteMessage({
                        QueueUrl: process.env.QUEUE as string,
                        ReceiptHandle: record.receiptHandle
                    }).promise();
                    lastDeletedIndex++;
                    console.log(`Message ${event.Records[i].messageId} deleted.`);
                }
            } catch (err) {
                console.log(`Error in message group ${messageGroups[i]}`);
                console.error(err);
                // Print each message
                for (const record of messages[messageGroups[i]]) {
                    console.log(`Message ${record.messageId}`);
                    console.log(record.body);
                }
                // Delete all messages not deleted.
                for (let j = lastDeletedIndex + 1; j < messages[messageGroups[i]].length; j++) {
                    console.log(`[ErrorHandling]: Deleting message ${messages[messageGroups[i]][j].messageId}`);
                    await sqs.deleteMessage({
                        QueueUrl: process.env.QUEUE as string,
                        ReceiptHandle: messages[messageGroups[i]][j].receiptHandle
                    }).promise().catch(() => console.log('Failed to delete',  messages[messageGroups[i]][j].messageId));
                }
            }
        })());
    }

    console.log(`Waiting for all promises to be resolved.`);
    await Promise.all(promises);

    return {
        statusCode: 200,
        body: 'Message processed successfully!'
    }
}

