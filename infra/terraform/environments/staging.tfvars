environment        = "staging"
aws_region         = "us-east-1"
project_name       = "enheritage"
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]

auth0_issuer_url = "https://enheritage-staging.us.auth0.com/"
auth0_audience   = "https://api.staging.enheritage.com"

allowed_origins = [
  "https://staging.enheritage.com"
]

# RDS Aurora Serverless v2 — min 0.5 ACU for cost savings in staging
rds_min_acu = 0.5
rds_max_acu = 8

# ElastiCache — smallest burstable node for staging
redis_node_type = "cache.t4g.small"

# ECS autoscaling — minimum 1 task, max 2 in staging
ecs_min_capacity = 1
ecs_max_capacity = 2
