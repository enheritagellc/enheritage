locals {
  name_prefix   = "${var.project_name}-${var.environment}"
  database_name = replace(var.project_name, "-", "_")
}

# ---------------------------------------------------------------------------
# Master password — random, stored in Secrets Manager
# ---------------------------------------------------------------------------

resource "random_password" "master" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "rds_master" {
  name        = "${local.name_prefix}/rds/master-credentials"
  description = "Master credentials for Aurora cluster ${local.name_prefix}"
  kms_key_id  = var.kms_key_arn

  tags = {
    Name = "${local.name_prefix}-rds-master-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "rds_master" {
  secret_id = aws_secretsmanager_secret.rds_master.id
  secret_string = jsonencode({
    username = "enheritage_admin"
    password = random_password.master.result
    dbname   = local.database_name
    engine   = "aurora-postgresql"
  })
}

# ---------------------------------------------------------------------------
# DB subnet group
# ---------------------------------------------------------------------------

resource "aws_db_subnet_group" "main" {
  name        = "${local.name_prefix}-db-subnet-group"
  description = "Subnet group for ${local.name_prefix} Aurora cluster"
  subnet_ids  = var.data_subnet_ids

  tags = {
    Name = "${local.name_prefix}-db-subnet-group"
  }
}

# ---------------------------------------------------------------------------
# Aurora PostgreSQL Serverless v2 cluster
# ---------------------------------------------------------------------------

resource "aws_rds_cluster" "main" {
  cluster_identifier      = "${local.name_prefix}-aurora"
  engine                  = "aurora-postgresql"
  engine_mode             = "provisioned"
  engine_version          = "15.4"
  database_name           = local.database_name
  master_username         = "enheritage_admin"
  master_password         = random_password.master.result
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [var.rds_security_group_id]
  storage_encrypted       = true
  kms_key_id              = var.kms_key_arn
  deletion_protection     = var.deletion_protection
  backup_retention_period = 7
  preferred_backup_window = "02:00-03:00"
  skip_final_snapshot     = !var.deletion_protection
  final_snapshot_identifier = var.deletion_protection ? "${local.name_prefix}-final-snapshot" : null

  serverlessv2_scaling_configuration {
    min_capacity = var.min_acu
    max_capacity = var.max_acu
  }

  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = {
    Name = "${local.name_prefix}-aurora"
  }

  lifecycle {
    ignore_changes = [master_password]
  }
}

# ---------------------------------------------------------------------------
# Cluster instances — 1 writer + 1 reader
# ---------------------------------------------------------------------------

resource "aws_rds_cluster_instance" "writer" {
  identifier           = "${local.name_prefix}-aurora-writer"
  cluster_identifier   = aws_rds_cluster.main.id
  instance_class       = "db.serverless"
  engine               = aws_rds_cluster.main.engine
  engine_version       = aws_rds_cluster.main.engine_version
  db_subnet_group_name = aws_db_subnet_group.main.name

  performance_insights_enabled = true

  tags = {
    Name = "${local.name_prefix}-aurora-writer"
    Role = "writer"
  }
}

resource "aws_rds_cluster_instance" "reader" {
  identifier           = "${local.name_prefix}-aurora-reader"
  cluster_identifier   = aws_rds_cluster.main.id
  instance_class       = "db.serverless"
  engine               = aws_rds_cluster.main.engine
  engine_version       = aws_rds_cluster.main.engine_version
  db_subnet_group_name = aws_db_subnet_group.main.name

  performance_insights_enabled = true

  tags = {
    Name = "${local.name_prefix}-aurora-reader"
    Role = "reader"
  }
}
