from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "sqlite:///./arox_store.db"
    jwt_secret_key: str = ""
    jwt_expire_minutes: int = 30
    frontend_origin: str = "https://siinghniibandhan-wq.github.io"
    frontend_url: str = "https://siinghniibandhan-wq.github.io/arox-store/"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    openai_api_key: str = ""
    openai_moderation_model: str = "omni-moderation-latest"
settings = Settings()
