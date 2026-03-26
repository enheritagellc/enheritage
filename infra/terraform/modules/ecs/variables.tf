variable "service_name" {
  description = "Short name of the service (used in resource names)"
  type        = string
}

variable "cluster_id" {
  description = "ECS cluster ID"
  type        = string
}

variable "image_uri" {
  description = "Full ECR image URI including tag"
  type        = string
}

variable "cpu" {
  description = "Fargate task CPU units"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Fargate task memory in MiB"
  type        = number
  default     = 512
}

variable "port" {
  description = "Container port the service listens on"
  type        = number
  default     = 3000
}

variable "desired_count" {
  description = "Desired number of running tasks"
  type        = number
  default     = 1
}

variable "min_capacity" {
  description = "Minimum number of tasks for autoscaling"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum number of tasks for autoscaling"
  type        = number
  default     = 4
}

variable "private_subnet_ids" {
  description = "Subnet IDs for the ECS service network configuration"
  type        = list(string)
}

variable "security_group_id" {
  description = "Security group ID for the ECS tasks"
  type        = string
}

variable "target_group_arn" {
  description = "ARN of the ALB target group for this service"
  type        = string
}

variable "task_role_arn" {
  description = "IAM role ARN for the ECS task (application permissions)"
  type        = string
}

variable "execution_role_arn" {
  description = "IAM role ARN for ECS task execution (pull image, write logs)"
  type        = string
}

variable "environment_variables" {
  description = "Map of plaintext environment variables for the container"
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "List of secrets to inject from Secrets Manager / Parameter Store"
  type = list(object({
    name      = string
    valueFrom = string
  }))
  default = []
}
