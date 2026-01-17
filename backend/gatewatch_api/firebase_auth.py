"""
Firebase Authentication Backend for Django
"""
from rest_framework import authentication, exceptions
from firebase_admin import auth
from django.contrib.auth import get_user_model
from django.conf import settings

User = get_user_model()


class FirebaseAuthentication(authentication.BaseAuthentication):
    """
    Firebase token authentication backend.
    Clients should authenticate by passing the Firebase ID token in the Authorization header.
    
    Authorization: Bearer <firebase_token>
    """
    
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            return None
        
        id_token = auth_header.split('Bearer ')[1]
        
        try:
            # Verify the Firebase token
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token['uid']
            email = decoded_token.get('email', '')
            name = decoded_token.get('name', '')
            
        # Determine default role based on email (only for new users)
        if email.lower() == 'javerdomaraya7@gmail.com':
            default_role = 'admin'
        elif email.lower() == 'security@bipsu.edu.ph':
            default_role = 'security'
        else:
            default_role = 'security'  # Default role
        
        # Get or create user in Django using email as username
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email.split('@')[0],  # Use email prefix as username
                'first_name': name.split()[0] if name else email.split('@')[0],
                'last_name': name.split()[1] if name and len(name.split()) > 1 else '',
                'role': default_role,
            }
        )
        
        # For existing users, keep the role from database (don't override)
        
        if created:
            print(f"[FIREBASE] New user created: {email} with role: {default_role}")
        
        return (user, None)        except auth.InvalidIdTokenError:
            raise exceptions.AuthenticationFailed('Invalid Firebase token')
        except auth.ExpiredIdTokenError:
            raise exceptions.AuthenticationFailed('Firebase token has expired')
        except Exception as e:
            raise exceptions.AuthenticationFailed(f'Firebase authentication failed: {str(e)}')
    
    def authenticate_header(self, request):
        return 'Bearer'
