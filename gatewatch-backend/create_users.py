#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gatewatch_backend.settings')
django.setup()

from gatewatch_api.models import User

def create_demo_users():
    print("Creating demo users...")

    # Clear existing users
    User.objects.all().delete()
    print("Cleared existing users")

    # Create admin user
    admin = User.objects.create_user(
        username='admin@bipsu.edu.ph',
        email='admin@bipsu.edu.ph',
        password='admin123',
        role='admin',
        is_staff=True,
        is_superuser=True
    )
    print("Admin user created")

    # Create security user
    security = User.objects.create_user(
        username='security@bipsu.edu.ph',
        email='security@bipsu.edu.ph',
        password='security123',
        role='security'
    )
    print("Security user created")

    # Verify users
    users = User.objects.all()
    print(f"\nTotal users: {users.count()}")
    for user in users:
        print(f"- {user.username}: {user.role}")

    print("\nDemo users setup complete!")

if __name__ == '__main__':
    create_demo_users()