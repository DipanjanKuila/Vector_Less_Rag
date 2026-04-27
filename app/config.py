import os
from dotenv import load_dotenv

load_dotenv()

# Database
DB_NAME = os.getenv("DB_NAME", "agent")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

# API Keys
PAGEINDEX_API_KEY = os.getenv("PAGEINDEX_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# App
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")

# Validate required secrets
_required = {
    "DB_PASSWORD": DB_PASSWORD,
    "PAGEINDEX_API_KEY": PAGEINDEX_API_KEY,
    "GROQ_API_KEY": GROQ_API_KEY,
}
missing = [k for k, v in _required.items() if not v]
if missing:
    raise EnvironmentError(f"Missing required environment variables: {', '.join(missing)}")
