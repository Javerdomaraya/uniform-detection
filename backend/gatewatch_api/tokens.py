import hashlib
import secrets
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from django.utils.crypto import constant_time_compare, salted_hmac
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


class GateWatchPasswordResetTokenGenerator:
    """
    Custom token generator for password reset functionality.
    Uses cryptographically secure random tokens with expiration.
    """

    # Token expiration time (7 days)
    TOKEN_EXPIRY = timedelta(days=7)

    # Key salt for HMAC
    KEY_SALT = "gatewatch.auth.tokens.PasswordResetTokenGenerator"

    def make_token(self, user):
        """
        Generate a secure token for the given user.
        Returns a URL-safe token string.
        """
        # Create a random token
        token = secrets.token_urlsafe(32)

        # Create timestamp
        timestamp = int(timezone.now().timestamp())

        # Create a hash of user data + timestamp + secret key for verification
        user_hash = self._make_hash_value(user, timestamp)

        # Combine everything into a single token
        # Format: timestamp.token.user_hash
        token_string = f"{timestamp}.{token}.{user_hash}"

        return token_string

    def check_token(self, user, token):
        """
        Check if the token is valid for the given user.
        Returns True if valid, False otherwise.
        """
        if not token or not user:
            return False

        try:
            # Split the token
            parts = token.split('.')
            if len(parts) != 3:
                return False

            timestamp_str, random_token, user_hash = parts

            # Convert timestamp
            timestamp = int(timestamp_str)

            # Check if token has expired
            if self._token_expired(timestamp):
                return False

            # Verify the user hash matches
            expected_hash = self._make_hash_value(user, timestamp)
            if not constant_time_compare(user_hash, expected_hash):
                return False

            return True

        except (ValueError, TypeError):
            return False

    def _make_hash_value(self, user, timestamp):
        """
        Create a hash value for the user and timestamp.
        This ensures the token is tied to the specific user and time.
        """
        # Use HMAC with a salt for additional security
        key_salt = self.KEY_SALT
        value = f"{user.pk}{user.password}{timestamp}"

        hash_value = salted_hmac(
            key_salt=key_salt,
            value=value,
            secret=settings.SECRET_KEY,
            algorithm='sha256'
        ).hexdigest()

        return hash_value

    def _token_expired(self, timestamp):
        """
        Check if the token timestamp indicates expiration.
        """
        from datetime import timezone as dt_timezone
        now = timezone.now()
        token_time = datetime.fromtimestamp(timestamp, tz=dt_timezone.utc)

        # Check if token is from the future (invalid)
        if token_time > now:
            return True

        # Check if token has expired
        expiry_time = token_time + self.TOKEN_EXPIRY
        return now > expiry_time

    def get_token_expiry_time(self, token):
        """
        Get the expiry timestamp for a token.
        Returns None if token is invalid.
        """
        try:
            from datetime import timezone as dt_timezone
            timestamp_str = token.split('.')[0]
            timestamp = int(timestamp_str)
            token_time = datetime.fromtimestamp(timestamp, tz=dt_timezone.utc)
            expiry_time = token_time + self.TOKEN_EXPIRY
            return expiry_time
        except (ValueError, IndexError):
            return None


# Global instance for use throughout the application
default_token_generator = GateWatchPasswordResetTokenGenerator()