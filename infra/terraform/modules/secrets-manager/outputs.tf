output "auth0_secret_arn" {
  description = "ARN of the Auth0 credentials secret"
  value       = aws_secretsmanager_secret.auth0.arn
}

output "enrichment_api_keys_arn" {
  description = "ARN of the enrichment API keys secret"
  value       = aws_secretsmanager_secret.enrichment_api_keys.arn
}

output "notification_secret_arn" {
  description = "ARN of the notification service config secret"
  value       = aws_secretsmanager_secret.notification.arn
}
