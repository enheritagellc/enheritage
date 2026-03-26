variable "project_name" {
  description = "Project name prefix"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "s3_kms_key_arn" {
  description = "ARN of the KMS key for S3 server-side encryption"
  type        = string
}
