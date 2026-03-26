variable "project_name" {
  description = "Project name prefix"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "data_subnet_ids" {
  description = "List of subnet IDs for the DB subnet group"
  type        = list(string)
}

variable "rds_security_group_id" {
  description = "Security group ID to attach to the RDS cluster"
  type        = string
}

variable "kms_key_arn" {
  description = "ARN of the KMS key for RDS storage encryption"
  type        = string
}

variable "min_acu" {
  description = "Minimum Aurora Capacity Units for Serverless v2"
  type        = number
  default     = 0.5
}

variable "max_acu" {
  description = "Maximum Aurora Capacity Units for Serverless v2"
  type        = number
  default     = 16
}

variable "deletion_protection" {
  description = "Enable deletion protection on the cluster"
  type        = bool
  default     = false
}
