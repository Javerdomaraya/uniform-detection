"""
Script to fix Firebase users in the database
Updates usernames from Firebase UIDs to email prefixes and sets proper roles
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gatewatch_backend.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def fix_firebase_users():
    """Fix users created by Firebase auth"""
    
    # Find users with Firebase UID as username (long random strings)
    users = User.objects.filter(username__regex=r'^[a-zA-Z0-9]{20,}$')
    
    print(f"Found {users.count()} users with Firebase UID usernames")
    
    for user in users:
        old_username = user.username
        
        if user.email:
            # Update username to email prefix
            new_username = user.email.split('@')[0]
            user.username = new_username
            
            # Set first_name if empty
            if not user.first_name:
                user.first_name = new_username
            
            # Set role based on email
            if user.email.lower() == 'javerdomaraya7@gmail.com':
                user.role = 'admin'
            elif user.email.lower() == 'security@bipsu.edu.ph':
                user.role = 'security'
            elif not user.role:
                user.role = 'security'
            
            user.save()
            
            print(f"✅ Updated user:")
            print(f"   Email: {user.email}")
            print(f"   Username: {old_username} → {new_username}")
            print(f"   Role: {user.role}")
            print(f"   Name: {user.first_name} {user.last_name}")
            print()
        else:
            print(f"⚠️  User {old_username} has no email, skipping")
    
    print("✅ All Firebase users fixed!")

if __name__ == '__main__':
    fix_firebase_users()
