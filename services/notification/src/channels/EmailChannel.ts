/**
 * EmailChannel — sends transactional email via AWS SES.
 *
 * In DRY_RUN mode (default in development) the email is logged but not sent.
 * LocalStack supports SES but delivery requires a real AWS account.
 */

import {
  SESClient,
  SendEmailCommand,
  type SendEmailCommandInput,
} from '@aws-sdk/client-ses';
import { config } from '../config.js';

let _client: SESClient | null = null;

function client(): SESClient {
  if (!_client) {
    _client = new SESClient({
      region: config.AWS_REGION,
      ...(config.AWS_ENDPOINT_URL ? { endpoint: config.AWS_ENDPOINT_URL } : {}),
    });
  }
  return _client;
}

export interface EmailPayload {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

export interface SendResult {
  messageId: string | null;
  dryRun: boolean;
}

export async function sendEmail(payload: EmailPayload): Promise<SendResult> {
  if (config.DRY_RUN) {
    console.info('[email] DRY_RUN — would send to %s: %s', payload.to, payload.subject);
    return { messageId: null, dryRun: true };
  }

  const input: SendEmailCommandInput = {
    Source: `${config.SES_FROM_NAME} <${config.SES_FROM_ADDRESS}>`,
    Destination: { ToAddresses: [payload.to] },
    Message: {
      Subject: { Data: payload.subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: payload.bodyHtml, Charset: 'UTF-8' },
        Text: { Data: payload.bodyText, Charset: 'UTF-8' },
      },
    },
  };

  const result = await client().send(new SendEmailCommand(input));
  return { messageId: result.MessageId ?? null, dryRun: false };
}
