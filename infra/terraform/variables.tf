variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (staging or production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be staging or production."
  }
}

variable "project_name" {
  description = "Project name prefix for all resources"
  type        = string
  default     = "enheritage"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "auth0_issuer_url" {
  description = "Auth0 issuer URL for JWT authorizer (e.g. https://your-tenant.us.auth0.com/)"
  type        = string
}

variable "auth0_audience" {
  description = "Auth0 API audience identifier"
  type        = string
}

variable "allowed_origins" {
  description = "Allowed CORS origins for API Gateway"
  type        = list(string)
  default     = []
}

variable "rds_min_acu" {
  description = "Minimum Aurora Capacity Units for the RDS Serverless v2 cluster"
  type        = number
  default     = 0.5
}

variable "rds_max_acu" {
  description = "Maximum Aurora Capacity Units for the RDS Serverless v2 cluster"
  type        = number
  default     = 16
}

variable "redis_node_type" {
  description = "ElastiCache node type for Redis"
  type        = string
  default     = "cache.t4g.small"
}

variable "ecs_min_capacity" {
  description = "Minimum number of ECS tasks per service"
  type        = number
  default     = 1
}

variable "ecs_max_capacity" {
  description = "Maximum number of ECS tasks per service"
  type        = number
  default     = 4
}
