/**
 * SmsChannel — sends SMS via AWS SNS direct publish.
 *
 * Only active when SNS_SMS_ENABLED=true. DRY_RUN suppresses the real send.
 */

import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { config } from '../config.js';

let _client: SNSClient | null = null;

function client(): SNSClient {
  if (!_client) {
    _client = new SNSClient({
      region: config.AWS_REGION,
      ...(config.AWS_ENDPOINT_URL ? { endpoint: config.AWS_ENDPOINT_URL } : {}),
    });
  }
  return _client;
}

export interface SmsPayload {
  phoneNumber: string; // E.164 format, e.g. +15551234567
  message: string;
}

export interface SendResult {
  messageId: string | null;
  dryRun: boolean;
  skipped: boolean;
}

export async function sendSms(payload: SmsPayload): Promise<SendResult> {
  if (!config.SNS_SMS_ENABLED) {
    console.info('[sms] SNS_SMS_ENABLED=false — skipping SMS to %s', payload.phoneNumber);
    return { messageId: null, dryRun: false, skipped: true };
  }

  if (config.DRY_RUN) {
    console.info('[sms] DRY_RUN — would SMS %s: %s', payload.phoneNumber, payload.message);
    return { messageId: null, dryRun: true, skipped: false };
  }

  const result = await client().send(
    new PublishCommand({
      PhoneNumber: payload.phoneNumber,
      Message: payload.message,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: 'Enheritage',
        },
      },
    }),
  );

  return { messageId: result.MessageId ?? null, dryRun: false, skipped: false };
}
