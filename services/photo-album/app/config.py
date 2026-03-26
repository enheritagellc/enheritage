from __future__ import annotations
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    port: int = 8000
    log_level: str = "info"
    node_env: str = "development"

    # Database
    database_url: str = "postgres://enheritage:enheritage_dev@localhost:5432/enheritage"

    # AWS
    aws_region: str = "us-east-1"
    aws_endpoint_url: str | None = None
    s3_bucket_photos: str = "enheritage-photos-dev"

    # OpenAI
    openai_api_key: str = ""
    openai_vision_model: str = "gpt-4o"

    # Rekognition
    rekognition_enabled: bool = False

    # Image sizes
    thumbnail_size: int = 300   # square crop
    preview_width: int = 1200   # max width, preserves aspect

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
