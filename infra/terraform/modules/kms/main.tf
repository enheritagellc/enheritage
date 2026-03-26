locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# ---------------------------------------------------------------------------
# Key policy — allows root account full access + ECS task role usage
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "kms_key_policy" {
  # Root account has full control so the key is not orphaned
  statement {
    sid    = "RootFullAccess"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${var.account_id}:root"]
    }
    actions   = ["kms:*"]
    resources = ["*"]
  }

  # ECS tasks may use the key for Encrypt/Decrypt operations
  statement {
    sid    = "ECSTaskKeyUsage"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${var.account_id}:root"]
    }
    actions = [
      "kms:Decrypt",
      "kms:DescribeKey",
      "kms:Encrypt",
      "kms:GenerateDataKey*",
      "kms:ReEncrypt*",
    ]
    resources = ["*"]
    condition {
      test     = "StringLike"
      variable = "aws:PrincipalArn"
      values = [
        "arn:aws:iam::${var.account_id}:role/*-ecs-task",
        "arn:aws:iam::${var.account_id}:role/*-ecs-execution",
      ]
    }
  }

  # Allow RDS service to use the key
  statement {
    sid    = "RDSKeyUsage"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["rds.amazonaws.com"]
    }
    actions = [
      "kms:Decrypt",
      "kms:DescribeKey",
      "kms:Encrypt",
      "kms:GenerateDataKey*",
      "kms:CreateGrant",
    ]
    resources = ["*"]
  }
}

# ---------------------------------------------------------------------------
# RDS encryption key
# ---------------------------------------------------------------------------

resource "aws_kms_key" "rds" {
  description             = "${local.name_prefix} RDS encryption key"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  policy                  = data.aws_iam_policy_document.kms_key_policy.json

  tags = {
    Name    = "${local.name_prefix}-kms-rds"
    Purpose = "rds-encryption"
  }
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${var.project_name}/${var.environment}/rds"
  target_key_id = aws_kms_key.rds.key_id
}

# ---------------------------------------------------------------------------
# S3 SSE key
# ---------------------------------------------------------------------------

resource "aws_kms_key" "s3" {
  description             = "${local.name_prefix} S3 SSE encryption key"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  policy                  = data.aws_iam_policy_document.kms_key_policy.json

  tags = {
    Name    = "${local.name_prefix}-kms-s3"
    Purpose = "s3-sse"
  }
}

resource "aws_kms_alias" "s3" {
  name          = "alias/${var.project_name}/${var.environment}/s3"
  target_key_id = aws_kms_key.s3.key_id
}

# ---------------------------------------------------------------------------
# Vault service key (encrypts per-user CMK metadata)
# ---------------------------------------------------------------------------

resource "aws_kms_key" "vault" {
  description             = "${local.name_prefix} vault service metadata encryption key"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  policy                  = data.aws_iam_policy_document.kms_key_policy.json

  tags = {
    Name    = "${local.name_prefix}-kms-vault"
    Purpose = "vault-metadata"
  }
}

resource "aws_kms_alias" "vault" {
  name          = "alias/${var.project_name}/${var.environment}/vault"
  target_key_id = aws_kms_key.vault.key_id
}
