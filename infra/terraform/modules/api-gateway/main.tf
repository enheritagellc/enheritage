locals {
  name_prefix = "${var.project_name}-${var.environment}"

  # Route definitions: path_pattern → { integration_key, authorizer }
  routes = {
    "POST /auth/{proxy+}"            = { integration = "auth",          auth = false }
    "ANY /interviews/{proxy+}"       = { integration = "interview",      auth = true  }
    "ANY /uploads/{proxy+}"          = { integration = "media-ingestion", auth = true }
    "ANY /enrichment/{proxy+}"       = { integration = "enrichment",     auth = true  }
    "ANY /trees/{proxy+}"            = { integration = "family-tree",    auth = true  }
    "ANY /renders/{proxy+}"          = { integration = "keepsake-render", auth = true }
    "ANY /notifications/{proxy+}"    = { integration = "notification",   auth = true  }
    "ANY /vaults/{proxy+}"           = { integration = "vault",          auth = true  }
    "ANY /transcriptions/{proxy+}"   = { integration = "transcription",  auth = true  }
    "ANY /entities/{proxy+}"         = { integration = "nlp-ner",        auth = true  }
    "ANY /biographies/{proxy+}"      = { integration = "biography-gen",  auth = true  }
    "ANY /photos/{proxy+}"           = { integration = "photo-album",    auth = true  }
  }

  # Listener rules on the ALB map service names to ports
  service_ports = {
    "auth"            = 3000
    "interview"       = 3000
    "media-ingestion" = 3000
    "enrichment"      = 3000
    "family-tree"     = 3000
    "keepsake-render" = 3000
    "notification"    = 3000
    "vault"           = 3000
    "transcription"   = 8000
    "nlp-ner"         = 8000
    "biography-gen"   = 8000
    "photo-album"     = 8000
  }
}

# ---------------------------------------------------------------------------
# HTTP API
# ---------------------------------------------------------------------------

resource "aws_apigatewayv2_api" "main" {
  name          = "${local.name_prefix}-api"
  protocol_type = "HTTP"
  description   = "Enheritage platform API — ${var.environment}"

  cors_configuration {
    allow_origins     = var.allowed_origins
    allow_methods     = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    allow_headers     = ["Content-Type", "Authorization", "X-Requested-With", "X-Amz-Date", "X-Api-Key"]
    expose_headers    = ["X-Request-Id"]
    max_age           = 3600
    allow_credentials = length(var.allowed_origins) > 0 && var.allowed_origins[0] != "*"
  }
}

# ---------------------------------------------------------------------------
# JWT Authorizer (Auth0)
# ---------------------------------------------------------------------------

resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${local.name_prefix}-jwt-authorizer"

  jwt_configuration {
    issuer   = var.auth0_issuer_url
    audience = [var.auth0_audience]
  }
}

# ---------------------------------------------------------------------------
# VPC Link — connects API Gateway to the internal ALB
# ---------------------------------------------------------------------------

resource "aws_apigatewayv2_vpc_link" "main" {
  name               = "${local.name_prefix}-vpc-link"
  subnet_ids         = var.private_subnet_ids
  security_group_ids = []

  tags = {
    Name = "${local.name_prefix}-vpc-link"
  }
}

# ---------------------------------------------------------------------------
# Integrations — one per backend service, all via VPC Link → ALB
# ---------------------------------------------------------------------------

resource "aws_apigatewayv2_integration" "services" {
  for_each = local.service_ports

  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "HTTP_PROXY"
  integration_method = "ANY"

  # Route to the ALB; the listener rule must forward based on Host/path prefix
  integration_uri    = "http://${var.alb_dns_name}:${each.value}/{proxy}"

  connection_type    = "VPC_LINK"
  connection_id      = aws_apigatewayv2_vpc_link.main.id

  payload_format_version = "1.0"

  request_parameters = {
    "overwrite:header.X-Forwarded-Service" = each.key
  }
}

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

resource "aws_apigatewayv2_route" "routes" {
  for_each = local.routes

  api_id    = aws_apigatewayv2_api.main.id
  route_key = each.key

  target = "integrations/${aws_apigatewayv2_integration.services[each.value.integration].id}"

  authorization_type = each.value.auth ? "JWT" : "NONE"
  authorizer_id      = each.value.auth ? aws_apigatewayv2_authorizer.jwt.id : null
}

# ---------------------------------------------------------------------------
# Stage — auto-deploy enabled, throttling configured
# ---------------------------------------------------------------------------

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 5000
    throttling_rate_limit  = 10000
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      integrationError = "$context.integrationErrorMessage"
    })
  }
}

resource "aws_cloudwatch_log_group" "api_gw" {
  name              = "/aws/apigateway/${local.name_prefix}"
  retention_in_days = 30
}
