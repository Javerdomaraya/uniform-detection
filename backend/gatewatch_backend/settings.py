import os
from dotenv import load_dotenv

load_dotenv()  # This loads the variables from the .env file
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv(
    "SECRET_KEY", "django-insecure-zt(4d98$zc*k3y^bp31*)cqr6m1uyy5%x1$ds_fkrg=(nno3yc"
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv("DEBUG", "True").lower() == "true"

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "192.168.254.32"]


# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party apps
    "rest_framework",
    "corsheaders",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    # Local app
    "gatewatch_api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "gatewatch_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "gatewatch_backend.wsgi.application"


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

import dj_database_url

# Check for SQLite migration mode (for data migration)
if os.getenv("DB_ENGINE") == "django.db.backends.sqlite3":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / os.getenv("DB_NAME", "db.sqlite3"),
        }
    }
# Try to use DATABASE_URL if available (recommended for Supabase)
elif os.getenv("DATABASE_URL"):
    DATABASES = {
        "default": dj_database_url.config(
            default=os.getenv("DATABASE_URL"),
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
    # Force SSL for Supabase
    DATABASES["default"]["OPTIONS"] = {
        "sslmode": "require",
    }
else:
    # Fall back to individual environment variables
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("DB_NAME", "postgres"),
            "USER": os.getenv("DB_USER", "postgres"),
            "PASSWORD": os.getenv("DB_PASSWORD"),
            "HOST": os.getenv("DB_HOST"),
            "PORT": os.getenv("DB_PORT", "5432"),
            "OPTIONS": {
                "sslmode": "require",
            },
        }
    }
# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = "static/"

# Media files (user-uploaded content)
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# REST Framework configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        # Temporarily allow unauthenticated access for testing
        # 'rest_framework.permissions.IsAuthenticated',
    ],
}

# Throttling limits for sensitive endpoints
REST_FRAMEWORK.setdefault("DEFAULT_THROTTLE_RATES", {})
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"].update(
    {
        "reset_password": "5/hour",
    }
)

# JWT Configuration
from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": False,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "VERIFYING_KEY": None,
    "AUDIENCE": None,
    "ISSUER": None,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_TYPE_CLAIM": "token_type",
}

# CORS configuration
CORS_ALLOW_ALL_ORIGINS = True  # For development, set to specific domains in production

# Custom User Model
AUTH_USER_MODEL = "gatewatch_api.User"

# Authentication backends
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
]

# Cloudinary Configuration
import cloudinary
import cloudinary.uploader
import cloudinary.api

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)

# Firebase Configuration
import json
import firebase_admin
from firebase_admin import credentials

FIREBASE_CRED_PATH = os.path.join(BASE_DIR, "firebase-creds.json")

if not firebase_admin._apps:
    firebase_cred = None

    # Priority 1: Environment variable (production/Render)
    env_cred = os.getenv("FIREBASE_CREDENTIALS_JSON")
    if env_cred:
        try:
            cred_dict = json.loads(env_cred)
            firebase_cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(firebase_cred)
            print("[FIREBASE] Connected successfully using environment variable!")
        except (json.JSONDecodeError, ValueError) as e:
            print(f"❌ [FIREBASE] Error: Invalid credentials: {e}")

    # Priority 2: Local file (development)
    elif os.path.exists(FIREBASE_CRED_PATH):
        try:
            firebase_cred = credentials.Certificate(FIREBASE_CRED_PATH)
            firebase_admin.initialize_app(firebase_cred)
            print("[FIREBASE] Connected successfully using local file!")
        except Exception as e:
            print(f"❌ [FIREBASE] Error loading from local file: {e}")

    # Error if neither works
    if not firebase_admin._apps:
        print(f"❌ [FIREBASE] No credentials found!")
        print(f"   Set FIREBASE_CREDENTIALS_JSON env var or place firebase-creds.json")

FIREBASE_CONFIG = {
    "apiKey": os.getenv("FIREBASE_API_KEY"),
    "authDomain": os.getenv("FIREBASE_AUTH_DOMAIN"),
    "projectId": os.getenv("FIREBASE_PROJECT_ID"),
    "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET"),
    "messagingSenderId": os.getenv("FIREBASE_MESSAGING_SENDER_ID"),
    "appId": os.getenv("FIREBASE_APP_ID"),
    "measurementId": os.getenv("FIREBASE_MEASUREMENT_ID"),
}

# Frontend URL for password reset (dev default to your current frontend port)
FRONTEND_RESET_PASSWORD_URL = "http://localhost:8081/login"

# Allowed emails for reset (whitelist)
ALLOWED_EMAILS = [
    "javerdomaraya7@gmail.com",
    "security@bipsu.edu.ph",
    "admin@bipsu.edu.ph",
]

# Email settings: configure SMTP settings in environment for production or set
# SENDGRID_API_KEY to send via SendGrid. Default is development no-email mode.
# Optional SendGrid API key - if set, the backend will attempt to use SendGrid
# for transactional emails and fall back to SMTP if SendGrid fails or is not
# installed.
SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")

# Django SMTP settings (configure these in production environment)
# backend/gatewatch_backend/settings.py

# --- GMAIL CONFIGURATION ---
# 1. Use SMTP to send real emails
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() == "true"

# 2. Your Credentials
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")

# 4. Default Sender
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "noreply@gatewatch.com")

# Enable email sending logic in your views
USE_EMAIL = True
