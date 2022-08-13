import { S3Event, S3EventRecord } from "aws-lambda";

export const handler = async (event: S3Event) => {
    console.log(`::: Processing event with ${event.Records.length} records :::`);
    
    // Process each record
    const records: any = event.Records.map(
        () => (async (record: S3EventRecord) => {
            // TODO: Record processing.
        })
    );

    // Process all records at same time.
    await Promise.all(records);
}