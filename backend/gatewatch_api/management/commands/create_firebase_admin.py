from django.core.management.base import BaseCommand
from gatewatch_api.models import User
from firebase_admin import auth


class Command(BaseCommand):
    help = 'Create a Firebase admin user'

    def handle(self, *args, **options):
        email = 'javerdomaraya7@gmail.com'
        password = 'javer0416'
        
        try:
            # Try to get or create Firebase user
            try:
                firebase_user = auth.get_user_by_email(email)
                self.stdout.write(f"Firebase user already exists: {firebase_user.uid}")
            except auth.UserNotFoundError:
                # Create Firebase user
                firebase_user = auth.create_user(
                    email=email,
                    password=password,
                    email_verified=True
                )
                self.stdout.write(self.style.SUCCESS(f"Created Firebase user: {firebase_user.uid}"))
            
            # Create or update Django user
            user, created = User.objects.update_or_create(
                email=email,
                defaults={
                    'username': email.split('@')[0],
                    'first_name': 'Javer',
                    'last_name': 'Domaraya',
                    'role': 'admin',
                    'is_active': True,
                    'is_staff': True,
                    'is_superuser': True,
                }
            )
            
            if created:
                self.stdout.write(self.style.SUCCESS(f"✅ Created Django admin user: {email}"))
            else:
                self.stdout.write(self.style.SUCCESS(f"✅ Updated Django admin user: {email}"))
            
            self.stdout.write(self.style.SUCCESS(f"\n🎉 Admin account ready!"))
            self.stdout.write(f"Email: {email}")
            self.stdout.write(f"Password: {password}")
            self.stdout.write(f"Role: admin")
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error: {str(e)}"))
            import traceback
            traceback.print_exc()
