import os
from dotenv import load_dotenv

load_dotenv()  # This loads the variables from the .env file
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-fallback-key-replace-in-production')

if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is not set. Please check your .env file.")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '192.168.254.32']


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',

    # Local app
    'gatewatch_api',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'gatewatch_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'gatewatch_backend.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT'),
        'OPTIONS': {
             # This setting helps enforce strict SQL mode, preventing some common data errors
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}

# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'

# Media files (user-uploaded content)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        # Temporarily allow unauthenticated access for testing
        # 'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}

# Throttling limits for sensitive endpoints
REST_FRAMEWORK.setdefault('DEFAULT_THROTTLE_RATES', {})
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'].update({
    'reset_password': '5/hour',
})

# JWT Configuration
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': False,

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,

    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',

    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# CORS configuration
CORS_ALLOW_ALL_ORIGINS = True  # For development, set to specific domains in production
CORS_ALLOW_CREDENTIALS = True

# CSRF Configuration - Exempt API endpoints from CSRF (they use JWT tokens instead)
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:8081',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8081',
]

# Custom User Model
AUTH_USER_MODEL = 'gatewatch_api.User'

# Authentication backends
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]

# Cloudinary Configuration
import cloudinary
import cloudinary.uploader
import cloudinary.api

cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET'),
    secure=True
)

# Firebase Configuration
import firebase_admin
from firebase_admin import credentials, auth
import os, json

# Load firebase credentials from env (preferred) or from file path
# --- FIREBASE CONFIGURATION (Local File) ---
# Build path to the file (looks for backend/firebase-creds.json)
FIREBASE_CRED_PATH = os.path.join(BASE_DIR, 'firebase-creds.json')

if not firebase_admin._apps:
    if os.path.exists(FIREBASE_CRED_PATH):
        cred = credentials.Certificate(FIREBASE_CRED_PATH)
        firebase_admin.initialize_app(cred)
        print("[FIREBASE] Connected successfully using local file!")
    else:
        print(f"❌ [FIREBASE] Error: File not found at {FIREBASE_CRED_PATH}")

FIREBASE_CONFIG = {
    'apiKey': os.getenv('FIREBASE_API_KEY'),
    'authDomain': os.getenv('FIREBASE_AUTH_DOMAIN'),
    'projectId': os.getenv('FIREBASE_PROJECT_ID'),
    'storageBucket': os.getenv('FIREBASE_STORAGE_BUCKET'),
    'messagingSenderId': os.getenv('FIREBASE_MESSAGING_SENDER_ID'),
    'appId': os.getenv('FIREBASE_APP_ID'),
    'measurementId': os.getenv('FIREBASE_MEASUREMENT_ID')
}

# Frontend URL for password reset (dev default to your current frontend port)
FRONTEND_RESET_PASSWORD_URL = os.getenv('FRONTEND_RESET_PASSWORD_URL', 'http://localhost:8081/login')

# Allowed emails for reset (parse comma-separated string from env)
ALLOWED_EMAILS = [
    email.strip() 
    for email in os.getenv('ALLOWED_EMAILS', 'javerdomaraya7@gmail.com,security@bipsu.edu.ph,admin@bipsu.edu.ph').split(',') 
    if email.strip()
]

# Email settings: configure SMTP settings in environment for production or set
# SENDGRID_API_KEY to send via SendGrid. Default is development no-email mode.
import os

# Optional SendGrid API key - if set, the backend will attempt to use SendGrid
# for transactional emails and fall back to SMTP if SendGrid fails or is not
# installed.
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY', '')

# Django SMTP settings (configure these in production environment)
# backend/gatewatch_backend/settings.py

# --- GMAIL CONFIGURATION ---
# 1. Use SMTP to send real emails
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend' 

EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True

# 2. Your Credentials
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
# 3. REMOVE SPACES from the App Password
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')

# 4. Default Sender
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', f'GateWatch Security <{EMAIL_HOST_USER}>')

# Enable email sending logic in your views
USE_EMAIL = True

# Violation Warning System Configuration
# Number of warnings before a uniform violation is recorded in the Review Center
WARNING_THRESHOLD = int(os.getenv('WARNING_THRESHOLD', '2'))  # After 2 warnings, the 3rd offense becomes a violation
# Days before warnings expire and reset (students get fresh start after this period)
WARNING_EXPIRY_DAYS = int(os.getenv('WARNING_EXPIRY_DAYS', '30'))  # Warnings older than 30 days won't count toward violations
# Valid violation types for the warning system
VIOLATION_TYPES = [
    'improper_uniform',
    'missing_id',
    'civilian_clothes',
    'missing_uniform_top',
    'other',
]