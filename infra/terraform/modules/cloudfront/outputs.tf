output "distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.main.id
}

output "distribution_domain" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "distribution_arn" {
  description = "ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.arn
}

output "distribution_hosted_zone_id" {
  description = "Route 53 zone ID for the CloudFront distribution (for alias records)"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}
