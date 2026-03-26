from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    port: int = 8002
    spacy_model: str = "en_core_web_sm"
    aws_region: str = "us-east-1"
    aws_endpoint_url: str | None = None
    s3_bucket_media: str = "enheritage-media-dev"
    sqs_ner_queue_url: str = ""
    sqs_enrichment_queue_url: str = ""
    log_level: str = "info"
    node_env: str = "development"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
