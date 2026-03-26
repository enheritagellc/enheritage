output "service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.service.name
}

output "service_id" {
  description = "ECS service ID"
  value       = aws_ecs_service.service.id
}

output "task_definition_arn" {
  description = "ARN of the latest task definition revision"
  value       = aws_ecs_task_definition.service.arn
}

output "log_group_name" {
  description = "CloudWatch log group name for this service"
  value       = aws_cloudwatch_log_group.service.name
}
