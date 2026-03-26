variable "project_name" {
  description = "Project name prefix"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "assets_bucket_id" {
  description = "S3 bucket name for the static assets origin"
  type        = string
}

variable "assets_bucket_domain" {
  description = "S3 bucket regional domain name for the static assets origin"
  type        = string
}

variable "api_gateway_endpoint" {
  description = "API Gateway invoke URL (without trailing slash)"
  type        = string
}

variable "web_acl_arn" {
  description = "ARN of a CLOUDFRONT-scoped WAF WebACL (optional)"
  type        = string
  default     = ""
}
