Backend environment variables and recommended production configuration
---------------------------------------------------------------

Essential environment variables (production recommended):

- FIREBASE_SERVICE_ACCOUNT_JSON: JSON string of Firebase service account credentials.
    - Alternatively use FIREBASE_SERVICE_ACCOUNT_FILE: a path to JSON file containing the service account.
- FRONTEND_RESET_PASSWORD_URL: URL to the frontend reset password route (ex: https://app.example.com/reset-password)
- SENDGRID_API_KEY: Optional SendGrid API key (if using SendGrid for transactional emails).
- USE_EMAIL: If set to `True`, backend will use SMTP settings below instead (for SMTP sending).
- EMAIL_HOST: SMTP host (e.g., smtp.sendgrid.net)
- EMAIL_PORT: SMTP port (587 for TLS)
- EMAIL_HOST_USER: SMTP username
- EMAIL_HOST_PASSWORD: SMTP password
- DEFAULT_FROM_EMAIL: From address for outgoing mail (e.g., no-reply@example.com)

Development notes:
- By default development is `DEBUG=True` and the firebase reset endpoint returns `reset_link` and `frontend_link` in the response payload for convenience.
- In production, set `DEBUG=False` and configure SendGrid or SMTP; the API will then send reset links by email and return a generic success message.

Security reminders:
- Do not store secrets in `settings.py`. Keep secrets in environment variables or a secret manager.
- Rotate Firebase keys and SendGrid API keys if ever exposed.
