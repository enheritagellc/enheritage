variable "project_name" {
  description = "Project name prefix"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "alb_dns_name" {
  description = "DNS name of the internal Application Load Balancer"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID (used for VPC Link)"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for the VPC Link"
  type        = list(string)
}

variable "allowed_origins" {
  description = "List of CORS allowed origins"
  type        = list(string)
  default     = ["*"]
}

variable "auth0_issuer_url" {
  description = "Auth0 issuer URL for JWT authorizer"
  type        = string
}

variable "auth0_audience" {
  description = "Auth0 API audience"
  type        = string
}
