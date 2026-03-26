output "cluster_endpoint" {
  description = "Neptune cluster writer endpoint"
  value       = aws_neptune_cluster.main.endpoint
}

output "reader_endpoint" {
  description = "Neptune cluster reader endpoint"
  value       = aws_neptune_cluster.main.reader_endpoint
}

output "cluster_identifier" {
  description = "Neptune cluster identifier"
  value       = aws_neptune_cluster.main.cluster_identifier
}

output "security_group_id" {
  description = "Neptune security group ID"
  value       = aws_security_group.neptune.id
}
