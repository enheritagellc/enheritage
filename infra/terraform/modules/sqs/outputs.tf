output "queue_urls" {
  description = "Map of queue logical name to queue URL"
  value = {
    for k, q in aws_sqs_queue.main : k => q.url
  }
}

output "queue_arns" {
  description = "Map of queue logical name to queue ARN"
  value = {
    for k, q in aws_sqs_queue.main : k => q.arn
  }
}

output "dlq_arns" {
  description = "Map of DLQ logical name to DLQ ARN"
  value = {
    for k, q in aws_sqs_queue.dlq : k => q.arn
  }
}
