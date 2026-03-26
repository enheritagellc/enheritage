output "api_id" {
  description = "ID of the API Gateway HTTP API"
  value       = aws_apigatewayv2_api.main.id
}

output "api_endpoint" {
  description = "Invoke URL for the API Gateway default stage"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "stage_arn" {
  description = "ARN of the API Gateway stage (used for WAF association)"
  value       = aws_apigatewayv2_stage.default.arn
}

output "vpc_link_id" {
  description = "ID of the VPC Link"
  value       = aws_apigatewayv2_vpc_link.main.id
}
