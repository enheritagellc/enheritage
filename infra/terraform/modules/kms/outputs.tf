output "rds_key_arn" {
  description = "ARN of the KMS key used for RDS encryption"
  value       = aws_kms_key.rds.arn
}

output "rds_key_id" {
  description = "ID of the KMS key used for RDS encryption"
  value       = aws_kms_key.rds.key_id
}

output "s3_key_arn" {
  description = "ARN of the KMS key used for S3 SSE"
  value       = aws_kms_key.s3.arn
}

output "s3_key_id" {
  description = "ID of the KMS key used for S3 SSE"
  value       = aws_kms_key.s3.key_id
}

output "vault_key_arn" {
  description = "ARN of the KMS key used by the vault service"
  value       = aws_kms_key.vault.arn
}

output "vault_key_id" {
  description = "ID of the KMS key used by the vault service"
  value       = aws_kms_key.vault.key_id
}
