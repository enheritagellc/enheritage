from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    port: int = 8003
    openai_api_key: str = ""
    openai_model: str = "gpt-4-turbo-preview"
    openai_max_tokens: int = 4096
    aws_region: str = "us-east-1"
    aws_endpoint_url: str | None = None
    s3_bucket_media: str = "enheritage-media-dev"
    sqs_biography_queue_url: str = ""
    sqs_render_queue_url: str = ""
    log_level: str = "info"
    node_env: str = "development"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
