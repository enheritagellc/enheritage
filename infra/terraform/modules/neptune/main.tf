locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# ---------------------------------------------------------------------------
# Security group — allow Gremlin/SPARQL (8182) from ECS only
# ---------------------------------------------------------------------------

resource "aws_security_group" "neptune" {
  name        = "${local.name_prefix}-sg-neptune"
  description = "Security group for Neptune graph DB cluster"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Neptune Gremlin/SPARQL from ECS services"
    from_port       = 8182
    to_port         = 8182
    protocol        = "tcp"
    security_groups = [var.ecs_security_group_id]
  }

  tags = {
    Name = "${local.name_prefix}-sg-neptune"
  }
}

# ---------------------------------------------------------------------------
# Subnet group
# ---------------------------------------------------------------------------

resource "aws_neptune_subnet_group" "main" {
  name        = "${local.name_prefix}-neptune-subnet-group"
  description = "Subnet group for ${local.name_prefix} Neptune cluster"
  subnet_ids  = var.data_subnet_ids

  tags = {
    Name = "${local.name_prefix}-neptune-subnet-group"
  }
}

# ---------------------------------------------------------------------------
# Cluster parameter group
# ---------------------------------------------------------------------------

resource "aws_neptune_cluster_parameter_group" "main" {
  family      = "neptune1.3"
  name        = "${local.name_prefix}-cluster-params"
  description = "Neptune cluster parameters for ${local.name_prefix}"

  parameter {
    name  = "neptune_enable_audit_log"
    value = "1"
  }
}

# ---------------------------------------------------------------------------
# Neptune cluster
# ---------------------------------------------------------------------------

resource "aws_neptune_cluster" "main" {
  cluster_identifier                  = "${local.name_prefix}-neptune"
  engine                              = "neptune"
  engine_version                      = "1.3.1.0"
  neptune_subnet_group_name           = aws_neptune_subnet_group.main.name
  vpc_security_group_ids              = [aws_security_group.neptune.id]
  neptune_cluster_parameter_group_name = aws_neptune_cluster_parameter_group.main.name
  storage_encrypted                   = true
  backup_retention_period             = 7
  preferred_backup_window             = "02:30-03:30"
  skip_final_snapshot                 = var.environment != "production"
  final_snapshot_identifier           = var.environment == "production" ? "${local.name_prefix}-neptune-final" : null
  deletion_protection                 = var.environment == "production"
  iam_database_authentication_enabled = true

  enabled_cloudwatch_logs_exports = ["audit"]

  tags = {
    Name = "${local.name_prefix}-neptune"
  }
}

# ---------------------------------------------------------------------------
# Neptune cluster instances
# ---------------------------------------------------------------------------

resource "aws_neptune_cluster_instance" "instances" {
  count = var.instance_count

  identifier         = "${local.name_prefix}-neptune-${count.index == 0 ? "writer" : "reader-${count.index}"}"
  cluster_identifier = aws_neptune_cluster.main.id
  instance_class     = var.instance_class
  engine             = "neptune"

  tags = {
    Name = "${local.name_prefix}-neptune-${count.index == 0 ? "writer" : "reader-${count.index}"}"
    Role = count.index == 0 ? "writer" : "reader"
  }
}
