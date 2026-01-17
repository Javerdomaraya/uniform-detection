from django.test import TestCase, override_settings
from django.conf import settings
import importlib, sys


class SendResetEmailTests(TestCase):
    def test_sendgrid_path(self):
        # Create a fake sendgrid module to intercept sends
        class FakeMail:
            def __init__(self, from_email=None, to_emails=None, subject=None, plain_text_content=None, html_content=None):
                self.from_email = from_email

        class FakeSGClient:
            def __init__(self, key):
                self.key = key

            def send(self, msg):
                return True

        fake_sendgrid = type('fake', (), {})()
        fake_sg_helper = type('sghelper', (), {})()
        fake_sendgrid.SendGridAPIClient = FakeSGClient
        fake_sg_helper.Mail = FakeMail

        sys.modules['sendgrid'] = fake_sendgrid
        sys.modules['sendgrid.helpers.mail'] = fake_sg_helper

        with override_settings(SENDGRID_API_KEY='fake-key', USE_EMAIL=False):
            from gatewatch_api.firebase_views import send_reset_email
            ok = send_reset_email('test@example.com', 'https://example.com/reset')
            self.assertTrue(ok)

    def test_smtp_fallback(self):
        # Ensure fallback to Django email backend works
        with override_settings(SENDGRID_API_KEY='', USE_EMAIL=True, EMAIL_HOST='localhost', EMAIL_PORT=1025, EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend'):
            from gatewatch_api.firebase_views import send_reset_email
            ok = send_reset_email('test@example.com', 'https://example.com/reset')
            self.assertTrue(ok)
