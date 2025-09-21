from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from gatewatch_api.tokens import default_token_generator

class Command(BaseCommand):
    help = 'Test the custom token generator'

    def handle(self, *args, **options):
        User = get_user_model()

        # Get all users
        users = User.objects.all()
        self.stdout.write(f'Found {users.count()} users:')

        for user in users:
            self.stdout.write(f'  - {user.username} ({user.email}) - Role: {user.role}')

            # Generate token
            token = default_token_generator.make_token(user)
            self.stdout.write(f'    Token: {token}')
            self.stdout.write(f'    Token length: {len(token)}')

            # Test token validation
            is_valid = default_token_generator.check_token(user, token)
            self.stdout.write(f'    Token valid: {is_valid}')

            # Test invalid token
            invalid_valid = default_token_generator.check_token(user, 'invalid.token.here')
            self.stdout.write(f'    Invalid token valid: {invalid_valid}')

            # Get expiry time
            expiry = default_token_generator.get_token_expiry_time(token)
            self.stdout.write(f'    Expires: {expiry}')
            self.stdout.write('')