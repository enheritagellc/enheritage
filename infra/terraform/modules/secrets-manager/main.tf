locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# ---------------------------------------------------------------------------
# Auth0 secrets (values populated post-deployment via AWS Console / CI)
# ---------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "auth0" {
  name        = "${local.name_prefix}/auth0/credentials"
  description = "Auth0 application credentials for ${local.name_prefix}"

  tags = {
    Name = "${local.name_prefix}-auth0-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "auth0_placeholder" {
  secret_id = aws_secretsmanager_secret.auth0.id
  secret_string = jsonencode({
    domain        = "REPLACE_WITH_AUTH0_DOMAIN"
    client_id     = "REPLACE_WITH_AUTH0_CLIENT_ID"
    client_secret = "REPLACE_WITH_AUTH0_CLIENT_SECRET"
    audience      = "REPLACE_WITH_AUTH0_AUDIENCE"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ---------------------------------------------------------------------------
# API keys for external enrichment services (Wikidata, FamilySearch, etc.)
# ---------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "enrichment_api_keys" {
  name        = "${local.name_prefix}/enrichment/api-keys"
  description = "API keys for external genealogy enrichment services"

  tags = {
    Name = "${local.name_prefix}-enrichment-api-keys"
  }
}

resource "aws_secretsmanager_secret_version" "enrichment_api_keys_placeholder" {
  secret_id = aws_secretsmanager_secret.enrichment_api_keys.id
  secret_string = jsonencode({
    familysearch_api_key = "REPLACE_WITH_FAMILYSEARCH_KEY"
    ancestry_api_key     = "REPLACE_WITH_ANCESTRY_KEY"
    openai_api_key       = "REPLACE_WITH_OPENAI_KEY"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ---------------------------------------------------------------------------
# Notification service secrets (SES, SMS)
# ---------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "notification" {
  name        = "${local.name_prefix}/notification/config"
  description = "Notification service configuration for ${local.name_prefix}"

  tags = {
    Name = "${local.name_prefix}-notification-config"
  }
}

resource "aws_secretsmanager_secret_version" "notification_placeholder" {
  secret_id = aws_secretsmanager_secret.notification.id
  secret_string = jsonencode({
    from_email          = "noreply@enheritage.com"
    ses_configuration_set = "enheritage-${var.environment}"
    twilio_account_sid  = "REPLACE_WITH_TWILIO_SID"
    twilio_auth_token   = "REPLACE_WITH_TWILIO_TOKEN"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}
