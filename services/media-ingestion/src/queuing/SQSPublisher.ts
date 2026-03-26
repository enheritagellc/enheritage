import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import type { DomainEvent } from '@enheritage/types';
import { config } from '../config.js';

export class SQSPublisher {
  private readonly client: SQSClient;

  constructor() {
    this.client = new SQSClient({
      region: config.AWS_REGION,
      ...(config.AWS_ENDPOINT_URL
        ? { endpoint: config.AWS_ENDPOINT_URL }
        : {}),
    });
  }

  async publish<T>(queueUrl: string, event: DomainEvent<T>): Promise<string> {
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(event),
      MessageAttributes: {
        eventType: {
          DataType: 'String',
          StringValue: event.type,
        },
        correlationId: {
          DataType: 'String',
          StringValue: event.correlationId,
        },
      },
    });

    const result = await this.client.send(command);

    if (!result.MessageId) {
      throw new Error(`SQS did not return a MessageId for queue ${queueUrl}`);
    }

    return result.MessageId;
  }
}
