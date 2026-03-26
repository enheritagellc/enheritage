output "vpc_id" {
  description = "ID of the VPC"
  value       = module.networking.vpc_id
}

output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = module.api_gateway.api_endpoint
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain name"
  value       = module.cloudfront.distribution_domain
}

output "rds_endpoint" {
  description = "Aurora cluster writer endpoint"
  value       = module.rds.cluster_endpoint
  sensitive   = true
}

output "rds_reader_endpoint" {
  description = "Aurora cluster reader endpoint"
  value       = module.rds.reader_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = module.elasticache.primary_endpoint
  sensitive   = true
}

output "sqs_queue_urls" {
  description = "Map of SQS queue name to URL"
  value       = module.sqs.queue_urls
}

output "s3_bucket_names" {
  description = "Map of S3 bucket logical name to bucket name"
  value = {
    media     = module.s3.media_bucket_id
    processed = module.s3.processed_bucket_id
    photos    = module.s3.photos_bucket_id
    renders   = module.s3.renders_bucket_id
    assets    = module.s3.assets_bucket_id
  }
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "alb_dns_name" {
  description = "Internal ALB DNS name"
  value       = aws_lb.main.dns_name
}
