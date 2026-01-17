"""
Script to remove duplicate users with the same email
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

def remove_duplicate_users():
    """Remove duplicate users with same email"""
    
    # Find duplicate users with email javerdomaraya7@gmail.com
    users = User.objects.filter(email='javerdomaraya7@gmail.com').order_by('id')
    
    print(f"Found {users.count()} users with email javerdomaraya7@gmail.com:")
    for user in users:
        print(f"  - ID: {user.id}, Username: {user.username}, Role: {user.role}")
    
    if users.count() > 1:
        # Keep the first one, delete the rest
        keep_user = users.first()
        delete_users = users.exclude(id=keep_user.id)
        
        print(f"\nKeeping user ID {keep_user.id} (username: {keep_user.username})")
        print(f"Deleting {delete_users.count()} duplicate(s)...")
        
        for dup in delete_users:
            print(f"  - Deleting ID: {dup.id}, Username: {dup.username}")
        
        delete_users.delete()
        print("✅ Duplicates deleted!")
        
        # Update the kept user to ensure correct data
        keep_user.username = 'javerdomaraya7'
        keep_user.email = 'javerdomaraya7@gmail.com'
        keep_user.role = 'admin'
        keep_user.first_name = 'javerdomaraya7'
        keep_user.save()
        print(f"✅ Updated user: {keep_user.username} (Role: {keep_user.role})")
    else:
        print("No duplicates found.")
    
    # Also check for security@bipsu.edu.ph
    security_users = User.objects.filter(email='security@bipsu.edu.ph').order_by('id')
    print(f"\nFound {security_users.count()} users with email security@bipsu.edu.ph")
    
    if security_users.count() > 1:
        keep_user = security_users.first()
        delete_users = security_users.exclude(id=keep_user.id)
        print(f"Deleting {delete_users.count()} duplicate(s)...")
        delete_users.delete()
        print("✅ Security user duplicates deleted!")

if __name__ == '__main__':
    remove_duplicate_users()
