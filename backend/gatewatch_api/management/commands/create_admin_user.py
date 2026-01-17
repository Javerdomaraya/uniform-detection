from django.core.management.base import BaseCommand
from gatewatch_api.models import User
import requests


class Command(BaseCommand):
    help = 'Create admin user directly in Django database'

    def handle(self, *args, **options):
        email = 'javerdomaraya7@gmail.com'
        
        try:
            # Create or update Django user
            user, created = User.objects.update_or_create(
                email=email,
                defaults={
                    'username': 'javerdomaraya7',
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
            
            self.stdout.write(self.style.SUCCESS(f"\n🎉 Admin account ready in Django!"))
            self.stdout.write(f"Email: {email}")
            self.stdout.write(f"Role: admin")
            self.stdout.write(f"\n⚠️  You also need to create this user in Firebase Console:")
            self.stdout.write(f"1. Go to https://console.firebase.google.com/")
            self.stdout.write(f"2. Select 'uniform-compliance' project")
            self.stdout.write(f"3. Go to Authentication → Users → Add User")
            self.stdout.write(f"4. Email: javerdomaraya7@gmail.com")
            self.stdout.write(f"5. Password: javer0416")
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error: {str(e)}"))
            import traceback
            traceback.print_exc()
