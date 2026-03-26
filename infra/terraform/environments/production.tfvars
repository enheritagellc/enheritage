environment        = "production"
aws_region         = "us-east-1"
project_name       = "enheritage"
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

auth0_issuer_url = "https://enheritage.us.auth0.com/"
auth0_audience   = "https://api.enheritage.com"

allowed_origins = [
  "https://app.enheritage.com",
  "https://www.enheritage.com"
]

# RDS Aurora Serverless v2 — min 1.0 ACU for production baseline
rds_min_acu = 1.0
rds_max_acu = 16

# ElastiCache — memory-optimized r7g for production
redis_node_type = "cache.r7g.large"

# ECS autoscaling — minimum 2 tasks per service for HA
ecs_min_capacity = 2
ecs_max_capacity = 10
