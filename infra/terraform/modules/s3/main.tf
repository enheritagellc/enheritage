locals {
  buckets = {
    media     = "${var.project_name}-media-${var.environment}"
    processed = "${var.project_name}-processed-${var.environment}"
    photos    = "${var.project_name}-photos-${var.environment}"
    renders   = "${var.project_name}-renders-${var.environment}"
    assets    = "${var.project_name}-assets-${var.environment}"
  }
}

# ---------------------------------------------------------------------------
# Bucket resources
# ---------------------------------------------------------------------------

resource "aws_s3_bucket" "buckets" {
  for_each = local.buckets

  bucket = each.value

  tags = {
    Name    = each.value
    Purpose = each.key
  }
}

# ---------------------------------------------------------------------------
# Block all public access on every bucket
# ---------------------------------------------------------------------------

resource "aws_s3_bucket_public_access_block" "buckets" {
  for_each = local.buckets

  bucket = aws_s3_bucket.buckets[each.key].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ---------------------------------------------------------------------------
# Versioning — enabled on all buckets
# ---------------------------------------------------------------------------

resource "aws_s3_bucket_versioning" "buckets" {
  for_each = local.buckets

  bucket = aws_s3_bucket.buckets[each.key].id

  versioning_configuration {
    status = "Enabled"
  }
}

# ---------------------------------------------------------------------------
# Server-side encryption with KMS
# ---------------------------------------------------------------------------

resource "aws_s3_bucket_server_side_encryption_configuration" "buckets" {
  for_each = local.buckets

  bucket = aws_s3_bucket.buckets[each.key].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.s3_kms_key_arn
    }
    bucket_key_enabled = true
  }
}

# ---------------------------------------------------------------------------
# Lifecycle rules — IA → Glacier → delete incomplete multiparts
# ---------------------------------------------------------------------------

resource "aws_s3_bucket_lifecycle_configuration" "buckets" {
  for_each = local.buckets

  bucket = aws_s3_bucket.buckets[each.key].id

  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    filter {}

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER"
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 90
      storage_class   = "GLACIER"
    }
  }

  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  depends_on = [aws_s3_bucket_versioning.buckets]
}
