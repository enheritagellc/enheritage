from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    port: int = 8001
    aws_region: str = "us-east-1"
    aws_endpoint_url: str | None = None
    s3_bucket_media: str = "enheritage-media-dev"
    sqs_transcription_queue_url: str = ""
    sqs_ner_queue_url: str = ""
    whisper_model_size: str = "medium"
    whisper_device: str = "cpu"
    log_level: str = "info"
    node_env: str = "development"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
