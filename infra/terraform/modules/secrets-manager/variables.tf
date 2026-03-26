variable "project_name" {
  description = "Project name prefix"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "rds_secret_arn" {
  description = "ARN of the RDS master credentials secret"
  type        = string
}

variable "redis_auth_arn" {
  description = "ARN of the ElastiCache Redis AUTH token secret"
  type        = string
}

variable "kms_vault_arn" {
  description = "ARN of the KMS vault key"
  type        = string
}
