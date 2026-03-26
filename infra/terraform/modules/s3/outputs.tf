output "media_bucket_id" {
  description = "Name of the media bucket"
  value       = aws_s3_bucket.buckets["media"].id
}

output "media_bucket_arn" {
  description = "ARN of the media bucket"
  value       = aws_s3_bucket.buckets["media"].arn
}

output "processed_bucket_id" {
  description = "Name of the processed-data bucket"
  value       = aws_s3_bucket.buckets["processed"].id
}

output "processed_bucket_arn" {
  description = "ARN of the processed-data bucket"
  value       = aws_s3_bucket.buckets["processed"].arn
}

output "photos_bucket_id" {
  description = "Name of the photos bucket"
  value       = aws_s3_bucket.buckets["photos"].id
}

output "photos_bucket_arn" {
  description = "ARN of the photos bucket"
  value       = aws_s3_bucket.buckets["photos"].arn
}

output "renders_bucket_id" {
  description = "Name of the renders bucket"
  value       = aws_s3_bucket.buckets["renders"].id
}

output "renders_bucket_arn" {
  description = "ARN of the renders bucket"
  value       = aws_s3_bucket.buckets["renders"].arn
}

output "assets_bucket_id" {
  description = "Name of the static assets bucket"
  value       = aws_s3_bucket.buckets["assets"].id
}

output "assets_bucket_arn" {
  description = "ARN of the static assets bucket"
  value       = aws_s3_bucket.buckets["assets"].arn
}

output "assets_bucket_domain" {
  description = "Regional domain name of the static assets bucket"
  value       = aws_s3_bucket.buckets["assets"].bucket_regional_domain_name
}
