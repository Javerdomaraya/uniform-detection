from django.core.management.base import BaseCommand
from gatewatch_api.models import User
from rest_framework_simplejwt.tokens import RefreshToken


class Command(BaseCommand):
    help = 'Generate JWT tokens for admin user for testing'

    def handle(self, *args, **options):
        email = 'javerdomaraya7@gmail.com'
        
        try:
            user = User.objects.filter(email=email).first()
            
            if not user:
                self.stdout.write(self.style.ERROR(f"❌ User not found: {email}"))
                return
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            self.stdout.write(self.style.SUCCESS(f"\n✅ Generated tokens for: {email}"))
            self.stdout.write(f"\nAccess Token:")
            self.stdout.write(str(refresh.access_token))
            self.stdout.write(f"\nRefresh Token:")
            self.stdout.write(str(refresh))
            self.stdout.write(f"\n\nYou can use these tokens to authenticate API requests.")
            self.stdout.write(f"Add this header to your requests:")
            self.stdout.write(f"Authorization: Bearer {str(refresh.access_token)}")
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error: {str(e)}"))
            import traceback
            traceback.print_exc()
