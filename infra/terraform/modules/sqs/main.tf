locals {
  queue_names = [
    "transcription",
    "ner",
    "enrichment",
    "biography",
    "render",
    "notification",
  ]
}

# ---------------------------------------------------------------------------
# Dead-letter queues (created first so they can be referenced in redrive policies)
# ---------------------------------------------------------------------------

resource "aws_sqs_queue" "dlq" {
  for_each = toset(local.queue_names)

  name                       = "enheritage-${each.key}-${var.environment}-dlq"
  message_retention_seconds  = 1209600 # 14 days
  receive_wait_time_seconds  = 20

  tags = {
    Name        = "enheritage-${each.key}-${var.environment}-dlq"
    Queue       = each.key
    Type        = "dlq"
  }
}

# ---------------------------------------------------------------------------
# Main queues with redrive policy pointing to DLQ
# ---------------------------------------------------------------------------

resource "aws_sqs_queue" "main" {
  for_each = toset(local.queue_names)

  name                       = "enheritage-${each.key}-${var.environment}"
  message_retention_seconds  = 1209600 # 14 days
  visibility_timeout_seconds = 300
  receive_wait_time_seconds  = 20      # long polling

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[each.key].arn
    maxReceiveCount     = 3
  })

  tags = {
    Name  = "enheritage-${each.key}-${var.environment}"
    Queue = each.key
    Type  = "main"
  }
}
