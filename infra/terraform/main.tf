locals {
  name_prefix = "${var.project_name}-${var.environment}"

  # ECR image URIs — populated after images are built and pushed
  images = {
    auth            = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${local.name_prefix}-auth:latest"
    interview       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${local.name_prefix}-interview:latest"
    media_ingestion = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${local.name_prefix}-media-ingestion:latest"
    enrichment      = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${local.name_prefix}-enrichment:latest"
    family_tree     = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${local.name_prefix}-family-tree:latest"
    keepsake_render = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${local.name_prefix}-keepsake-render:latest"
    notification    = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${local.name_prefix}-notification:latest"
    vault           = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${local.name_prefix}-vault:latest"
    transcription   = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${local.name_prefix}-transcription:latest"
    nlp_ner         = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${local.name_prefix}-nlp-ner:latest"
    biography_gen   = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${local.name_prefix}-biography-gen:latest"
    photo_album     = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${local.name_prefix}-photo-album:latest"
  }
}

data "aws_caller_identity" "current" {}

# ---------------------------------------------------------------------------
# ECS Cluster (shared by all services)
# ---------------------------------------------------------------------------

resource "aws_ecs_cluster" "main" {
  name = local.name_prefix

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
  }
}

# ---------------------------------------------------------------------------
# Networking
# ---------------------------------------------------------------------------

module "networking" {
  source = "./modules/networking"

  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
}

# ---------------------------------------------------------------------------
# KMS
# ---------------------------------------------------------------------------

module "kms" {
  source = "./modules/kms"

  project_name = var.project_name
  environment  = var.environment
  account_id   = data.aws_caller_identity.current.account_id
}

# ---------------------------------------------------------------------------
# S3
# ---------------------------------------------------------------------------

module "s3" {
  source = "./modules/s3"

  project_name   = var.project_name
  environment    = var.environment
  s3_kms_key_arn = module.kms.s3_key_arn
}

# ---------------------------------------------------------------------------
# SQS
# ---------------------------------------------------------------------------

module "sqs" {
  source = "./modules/sqs"

  project_name = var.project_name
  environment  = var.environment
}

# ---------------------------------------------------------------------------
# RDS (Aurora PostgreSQL Serverless v2)
# ---------------------------------------------------------------------------

module "rds" {
  source = "./modules/rds"

  project_name        = var.project_name
  environment         = var.environment
  data_subnet_ids     = module.networking.data_subnet_ids
  rds_security_group_id = module.networking.rds_security_group_id
  kms_key_arn         = module.kms.rds_key_arn
  min_acu             = var.rds_min_acu
  max_acu             = var.rds_max_acu
  deletion_protection = var.environment == "production"
}

# ---------------------------------------------------------------------------
# ElastiCache (Redis)
# ---------------------------------------------------------------------------

module "elasticache" {
  source = "./modules/elasticache"

  project_name                  = var.project_name
  environment                   = var.environment
  data_subnet_ids               = module.networking.data_subnet_ids
  elasticache_security_group_id = module.networking.elasticache_security_group_id
  node_type                     = var.redis_node_type
}

# ---------------------------------------------------------------------------
# Secrets Manager (shared secrets consumed by ECS tasks)
# ---------------------------------------------------------------------------

module "secrets_manager" {
  source = "./modules/secrets-manager"

  project_name    = var.project_name
  environment     = var.environment
  rds_secret_arn  = module.rds.secret_arn
  redis_auth_arn  = module.elasticache.auth_token_secret_arn
  kms_vault_arn   = module.kms.vault_key_arn
}

# ---------------------------------------------------------------------------
# IAM roles for ECS tasks
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "ecs_task_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_execution" {
  name               = "${local.name_prefix}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
}

resource "aws_iam_role_policy_attachment" "ecs_execution_managed" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task" {
  name               = "${local.name_prefix}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
}

data "aws_iam_policy_document" "ecs_task_permissions" {
  statement {
    sid    = "S3Access"
    effect = "Allow"
    actions = [
      "s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"
    ]
    resources = [
      module.s3.media_bucket_arn, "${module.s3.media_bucket_arn}/*",
      module.s3.processed_bucket_arn, "${module.s3.processed_bucket_arn}/*",
      module.s3.photos_bucket_arn, "${module.s3.photos_bucket_arn}/*",
      module.s3.renders_bucket_arn, "${module.s3.renders_bucket_arn}/*",
      module.s3.assets_bucket_arn, "${module.s3.assets_bucket_arn}/*",
    ]
  }

  statement {
    sid    = "SQSAccess"
    effect = "Allow"
    actions = [
      "sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage",
      "sqs:GetQueueAttributes", "sqs:GetQueueUrl"
    ]
    resources = values(module.sqs.queue_arns)
  }

  statement {
    sid    = "KMSAccess"
    effect = "Allow"
    actions = [
      "kms:Decrypt", "kms:GenerateDataKey", "kms:DescribeKey"
    ]
    resources = [
      module.kms.rds_key_arn,
      module.kms.s3_key_arn,
      module.kms.vault_key_arn,
    ]
  }

  statement {
    sid    = "SecretsManagerAccess"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue"
    ]
    resources = [
      module.rds.secret_arn,
      module.elasticache.auth_token_secret_arn,
    ]
  }
}

resource "aws_iam_role_policy" "ecs_task_permissions" {
  name   = "${local.name_prefix}-ecs-task-permissions"
  role   = aws_iam_role.ecs_task.id
  policy = data.aws_iam_policy_document.ecs_task_permissions.json
}

# ---------------------------------------------------------------------------
# ALB (Application Load Balancer) — shared by all ECS services
# ---------------------------------------------------------------------------

resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  internal           = true
  load_balancer_type = "application"
  security_groups    = [module.networking.alb_security_group_id]
  subnets            = module.networking.private_subnet_ids

  enable_deletion_protection = var.environment == "production"
}

# Target groups for each service (HTTP, port matching container port)
resource "aws_lb_target_group" "services" {
  for_each = {
    auth            = 3000
    interview       = 3000
    media-ingestion = 3000
    enrichment      = 3000
    family-tree     = 3000
    keepsake-render = 3000
    notification    = 3000
    vault           = 3000
    transcription   = 8000
    nlp-ner         = 8000
    biography-gen   = 8000
    photo-album     = 8000
  }

  name        = "${local.name_prefix}-${each.key}"
  port        = each.value
  protocol    = "HTTP"
  vpc_id      = module.networking.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Not Found"
      status_code  = "404"
    }
  }
}

# ---------------------------------------------------------------------------
# WAF (REGIONAL — attached to API Gateway)
# ---------------------------------------------------------------------------

module "waf" {
  source = "./modules/waf"

  project_name          = var.project_name
  environment           = var.environment
  api_gateway_stage_arn = module.api_gateway.stage_arn
}

# ---------------------------------------------------------------------------
# API Gateway
# ---------------------------------------------------------------------------

module "api_gateway" {
  source = "./modules/api-gateway"

  project_name    = var.project_name
  environment     = var.environment
  alb_dns_name    = aws_lb.main.dns_name
  vpc_id          = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  allowed_origins = var.allowed_origins
  auth0_issuer_url = var.auth0_issuer_url
  auth0_audience   = var.auth0_audience
}

# ---------------------------------------------------------------------------
# CloudFront
# ---------------------------------------------------------------------------

module "cloudfront" {
  source = "./modules/cloudfront"

  project_name         = var.project_name
  environment          = var.environment
  assets_bucket_id     = module.s3.assets_bucket_id
  assets_bucket_domain = module.s3.assets_bucket_domain
  api_gateway_endpoint = module.api_gateway.api_endpoint
}

# ---------------------------------------------------------------------------
# ECS Services
# ---------------------------------------------------------------------------

module "ecs_auth" {
  source = "./modules/ecs"

  service_name       = "auth"
  cluster_id         = aws_ecs_cluster.main.id
  image_uri          = local.images.auth
  cpu                = 256
  memory             = 512
  port               = 3000
  desired_count      = var.ecs_min_capacity
  min_capacity       = var.ecs_min_capacity
  max_capacity       = var.ecs_max_capacity
  private_subnet_ids = module.networking.private_subnet_ids
  security_group_id  = module.networking.ecs_security_group_id
  target_group_arn   = aws_lb_target_group.services["auth"].arn
  task_role_arn      = aws_iam_role.ecs_task.arn
  execution_role_arn = aws_iam_role.ecs_execution.arn
  environment_variables = {
    NODE_ENV   = var.environment
    PORT       = "3000"
    AWS_REGION = var.aws_region
  }
  secrets = [
    { name = "DATABASE_URL", valueFrom = module.rds.secret_arn }
  ]
}

module "ecs_interview" {
  source = "./modules/ecs"

  service_name       = "interview"
  cluster_id         = aws_ecs_cluster.main.id
  image_uri          = local.images.interview
  cpu                = 256
  memory             = 512
  port               = 3000
  desired_count      = var.ecs_min_capacity
  min_capacity       = var.ecs_min_capacity
  max_capacity       = var.ecs_max_capacity
  private_subnet_ids = module.networking.private_subnet_ids
  security_group_id  = module.networking.ecs_security_group_id
  target_group_arn   = aws_lb_target_group.services["interview"].arn
  task_role_arn      = aws_iam_role.ecs_task.arn
  execution_role_arn = aws_iam_role.ecs_execution.arn
  environment_variables = {
    NODE_ENV   = var.environment
    PORT       = "3000"
    AWS_REGION = var.aws_region
  }
  secrets = [
    { name = "DATABASE_URL", valueFrom = module.rds.secret_arn }
  ]
}

module "ecs_media_ingestion" {
  source = "./modules/ecs"

  service_name       = "media-ingestion"
  cluster_id         = aws_ecs_cluster.main.id
  image_uri          = local.images.media_ingestion
  cpu                = 512
  memory             = 1024
  port               = 3000
  desired_count      = var.ecs_min_capacity
  min_capacity       = var.ecs_min_capacity
  max_capacity       = var.ecs_max_capacity
  private_subnet_ids = module.networking.private_subnet_ids
  security_group_id  = module.networking.ecs_security_group_id
  target_group_arn   = aws_lb_target_group.services["media-ingestion"].arn
  task_role_arn      = aws_iam_role.ecs_task.arn
  execution_role_arn = aws_iam_role.ecs_execution.arn
  environment_variables = {
    NODE_ENV        = var.environment
    PORT            = "3000"
    AWS_REGION      = var.aws_region
    MEDIA_BUCKET    = module.s3.media_bucket_id
    SQS_TRANSCRIBE  = module.sqs.queue_urls["transcription"]
  }
  secrets = []
}

module "ecs_enrichment" {
  source = "./modules/ecs"

  service_name       = "enrichment"
  cluster_id         = aws_ecs_cluster.main.id
  image_uri          = local.images.enrichment
  cpu                = 256
  memory             = 512
  port               = 3000
  desired_count      = var.ecs_min_capacity
  min_capacity       = var.ecs_min_capacity
  max_capacity       = var.ecs_max_capacity
  private_subnet_ids = module.networking.private_subnet_ids
  security_group_id  = module.networking.ecs_security_group_id
  target_group_arn   = aws_lb_target_group.services["enrichment"].arn
  task_role_arn      = aws_iam_role.ecs_task.arn
  execution_role_arn = aws_iam_role.ecs_execution.arn
  environment_variables = {
    NODE_ENV         = var.environment
    PORT             = "3000"
    AWS_REGION       = var.aws_region
    SQS_ENRICHMENT   = module.sqs.queue_urls["enrichment"]
    PROCESSED_BUCKET = module.s3.processed_bucket_id
  }
  secrets = [
    { name = "REDIS_URL", valueFrom = module.elasticache.auth_token_secret_arn }
  ]
}

module "ecs_family_tree" {
  source = "./modules/ecs"

  service_name       = "family-tree"
  cluster_id         = aws_ecs_cluster.main.id
  image_uri          = local.images.family_tree
  cpu                = 256
  memory             = 512
  port               = 3000
  desired_count      = var.ecs_min_capacity
  min_capacity       = var.ecs_min_capacity
  max_capacity       = var.ecs_max_capacity
  private_subnet_ids = module.networking.private_subnet_ids
  security_group_id  = module.networking.ecs_security_group_id
  target_group_arn   = aws_lb_target_group.services["family-tree"].arn
  task_role_arn      = aws_iam_role.ecs_task.arn
  execution_role_arn = aws_iam_role.ecs_execution.arn
  environment_variables = {
    NODE_ENV   = var.environment
    PORT       = "3000"
    AWS_REGION = var.aws_region
  }
  secrets = [
    { name = "DATABASE_URL", valueFrom = module.rds.secret_arn }
  ]
}

module "ecs_keepsake_render" {
  source = "./modules/ecs"

  service_name       = "keepsake-render"
  cluster_id         = aws_ecs_cluster.main.id
  image_uri          = local.images.keepsake_render
  cpu                = 1024
  memory             = 2048
  port               = 3000
  desired_count      = var.ecs_min_capacity
  min_capacity       = var.ecs_min_capacity
  max_capacity       = var.ecs_max_capacity
  private_subnet_ids = module.networking.private_subnet_ids
  security_group_id  = module.networking.ecs_security_group_id
  target_group_arn   = aws_lb_target_group.services["keepsake-render"].arn
  task_role_arn      = aws_iam_role.ecs_task.arn
  execution_role_arn = aws_iam_role.ecs_execution.arn
  environment_variables = {
    NODE_ENV        = var.environment
    PORT            = "3000"
    AWS_REGION      = var.aws_region
    RENDERS_BUCKET  = module.s3.renders_bucket_id
    SQS_RENDER      = module.sqs.queue_urls["render"]
  }
  secrets = []
}

module "ecs_notification" {
  source = "./modules/ecs"

  service_name       = "notification"
  cluster_id         = aws_ecs_cluster.main.id
  image_uri          = local.images.notification
  cpu                = 256
  memory             = 512
  port               = 3000
  desired_count      = var.ecs_min_capacity
  min_capacity       = var.ecs_min_capacity
  max_capacity       = var.ecs_max_capacity
  private_subnet_ids = module.networking.private_subnet_ids
  security_group_id  = module.networking.ecs_security_group_id
  target_group_arn   = aws_lb_target_group.services["notification"].arn
  task_role_arn      = aws_iam_role.ecs_task.arn
  execution_role_arn = aws_iam_role.ecs_execution.arn
  environment_variables = {
    NODE_ENV            = var.environment
    PORT                = "3000"
    AWS_REGION          = var.aws_region
    SQS_NOTIFICATION    = module.sqs.queue_urls["notification"]
  }
  secrets = []
}

module "ecs_vault" {
  source = "./modules/ecs"

  service_name       = "vault"
  cluster_id         = aws_ecs_cluster.main.id
  image_uri          = local.images.vault
  cpu                = 256
  memory             = 512
  port               = 3000
  desired_count      = var.ecs_min_capacity
  min_capacity       = var.ecs_min_capacity
  max_capacity       = var.ecs_max_capacity
  private_subnet_ids = module.networking.private_subnet_ids
  security_group_id  = module.networking.ecs_security_group_id
  target_group_arn   = aws_lb_target_group.services["vault"].arn
  task_role_arn      = aws_iam_role.ecs_task.arn
  execution_role_arn = aws_iam_role.ecs_execution.arn
  environment_variables = {
    NODE_ENV      = var.environment
    PORT          = "3000"
    AWS_REGION    = var.aws_region
    PHOTOS_BUCKET = module.s3.photos_bucket_id
    KMS_KEY_ARN   = module.kms.vault_key_arn
  }
  secrets = []
}

module "ecs_transcription" {
  source = "./modules/ecs"

  service_name       = "transcription"
  cluster_id         = aws_ecs_cluster.main.id
  image_uri          = local.images.transcription
  cpu                = 2048
  memory             = 4096
  port               = 8000
  desired_count      = var.ecs_min_capacity
  min_capacity       = var.ecs_min_capacity
  max_capacity       = var.ecs_max_capacity
  private_subnet_ids = module.networking.private_subnet_ids
  security_group_id  = module.networking.ecs_security_group_id
  target_group_arn   = aws_lb_target_group.services["transcription"].arn
  task_role_arn      = aws_iam_role.ecs_task.arn
  execution_role_arn = aws_iam_role.ecs_execution.arn
  environment_variables = {
    PORT           = "8000"
    AWS_REGION     = var.aws_region
    MEDIA_BUCKET   = module.s3.media_bucket_id
    SQS_TRANSCRIBE = module.sqs.queue_urls["transcription"]
    SQS_NER        = module.sqs.queue_urls["ner"]
  }
  secrets = [
    { name = "DATABASE_URL", valueFrom = module.rds.secret_arn }
  ]
}

module "ecs_nlp_ner" {
  source = "./modules/ecs"

  service_name       = "nlp-ner"
  cluster_id         = aws_ecs_cluster.main.id
  image_uri          = local.images.nlp_ner
  cpu                = 1024
  memory             = 2048
  port               = 8000
  desired_count      = var.ecs_min_capacity
  min_capacity       = var.ecs_min_capacity
  max_capacity       = var.ecs_max_capacity
  private_subnet_ids = module.networking.private_subnet_ids
  security_group_id  = module.networking.ecs_security_group_id
  target_group_arn   = aws_lb_target_group.services["nlp-ner"].arn
  task_role_arn      = aws_iam_role.ecs_task.arn
  execution_role_arn = aws_iam_role.ecs_execution.arn
  environment_variables = {
    PORT             = "8000"
    AWS_REGION       = var.aws_region
    PROCESSED_BUCKET = module.s3.processed_bucket_id
    SQS_NER          = module.sqs.queue_urls["ner"]
    SQS_ENRICHMENT   = module.sqs.queue_urls["enrichment"]
  }
  secrets = []
}

module "ecs_biography_gen" {
  source = "./modules/ecs"

  service_name       = "biography-gen"
  cluster_id         = aws_ecs_cluster.main.id
  image_uri          = local.images.biography_gen
  cpu                = 1024
  memory             = 2048
  port               = 8000
  desired_count      = var.ecs_min_capacity
  min_capacity       = var.ecs_min_capacity
  max_capacity       = var.ecs_max_capacity
  private_subnet_ids = module.networking.private_subnet_ids
  security_group_id  = module.networking.ecs_security_group_id
  target_group_arn   = aws_lb_target_group.services["biography-gen"].arn
  task_role_arn      = aws_iam_role.ecs_task.arn
  execution_role_arn = aws_iam_role.ecs_execution.arn
  environment_variables = {
    PORT             = "8000"
    AWS_REGION       = var.aws_region
    PROCESSED_BUCKET = module.s3.processed_bucket_id
    SQS_BIOGRAPHY    = module.sqs.queue_urls["biography"]
  }
  secrets = []
}

module "ecs_photo_album" {
  source = "./modules/ecs"

  service_name       = "photo-album"
  cluster_id         = aws_ecs_cluster.main.id
  image_uri          = local.images.photo_album
  cpu                = 512
  memory             = 1024
  port               = 8000
  desired_count      = var.ecs_min_capacity
  min_capacity       = var.ecs_min_capacity
  max_capacity       = var.ecs_max_capacity
  private_subnet_ids = module.networking.private_subnet_ids
  security_group_id  = module.networking.ecs_security_group_id
  target_group_arn   = aws_lb_target_group.services["photo-album"].arn
  task_role_arn      = aws_iam_role.ecs_task.arn
  execution_role_arn = aws_iam_role.ecs_execution.arn
  environment_variables = {
    PORT          = "8000"
    AWS_REGION    = var.aws_region
    PHOTOS_BUCKET = module.s3.photos_bucket_id
  }
  secrets = []
}
