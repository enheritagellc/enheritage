variable "project_name" {
  description = "Project name prefix"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "data_subnet_ids" {
  description = "Subnet IDs for the Neptune subnet group"
  type        = list(string)
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "ecs_security_group_id" {
  description = "Security group ID of ECS tasks (allowed to connect)"
  type        = string
}

variable "instance_class" {
  description = "Neptune instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "instance_count" {
  description = "Number of Neptune instances (writer + readers)"
  type        = number
  default     = 1
}
