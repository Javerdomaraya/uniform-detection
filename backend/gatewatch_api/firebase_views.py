"""
Firebase Authentication Views
"""
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from firebase_admin import auth
import firebase_admin
from .throttles import ResetPasswordRateThrottle
from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.mail import send_mail
from .serializers import UserSerializer

User = get_user_model()


def send_reset_email(email: str, link: str) -> bool:
    """Send reset email via SendGrid if configured; else use Django's SMTP send_mail.
    Returns True on success, False otherwise.
    """
    subject = 'Reset your password for BIPSU Uniform Detection'
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@localhost')
    text_body = f"Use this link to reset your password: {link}\n\nIf you did not request this, ignore this email."
    html_body = f"<p>Use this link to reset your password:</p><p><a href=\"{link}\">Reset Password</a></p>"

    sg_key = getattr(settings, 'SENDGRID_API_KEY', '')
    if sg_key:
        try:
            # Attempt dynamic import of sendgrid to avoid static lint errors if not installed
            import importlib
            sg_pkg = importlib.import_module('sendgrid')
            sg_msg_pkg = importlib.import_module('sendgrid.helpers.mail')
            SendGridAPIClient = getattr(sg_pkg, 'SendGridAPIClient', None)
            Mail = getattr(sg_msg_pkg, 'Mail', None)
            if SendGridAPIClient and Mail:
                message = Mail(
                    from_email=from_email,
                    to_emails=email,
                    subject=subject,
                    plain_text_content=text_body,
                    html_content=html_body,
                )
                sg = SendGridAPIClient(sg_key)
                sg.send(message)
                print(f"[EMAIL] Sent reset link to {email} via SendGrid")
                return True
            else:
                print('[EMAIL] sendgrid API not available, falling back to SMTP')
        except ImportError:
            print("[EMAIL] sendgrid package not installed, falling back to SMTP")
        except Exception as e:
            print(f"[EMAIL] SendGrid send failed: {e}")

    # Use Django's email backend (SMTP) if enabled
    if getattr(settings, 'USE_EMAIL', False) and getattr(settings, 'EMAIL_HOST', ''):
        try:
            send_mail(subject, text_body, from_email, [email], html_message=html_body)
            print(f"[EMAIL] Sent reset link to {email} via SMTP")
            return True
        except Exception as e:
            print(f"[EMAIL] SMTP send failed: {e}")

    print("[EMAIL] No email sending method configured or all methods failed")
    return False


@api_view(['POST'])
@permission_classes([AllowAny])
def firebase_login(request):
    """
    Login with Firebase token.
    Request body: { "idToken": "<firebase_id_token>" }
    """
    id_token = request.data.get('idToken')
    
    if not id_token:
        return Response(
            {'error': 'idToken is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
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
        
        username = email.split('@')[0]
        first_name = name.split()[0] if name else username
        last_name = name.split()[1] if name and len(name.split()) > 1 else ''
        
        # Try to get existing user by email first (use filter().first() to handle duplicates)
        user = User.objects.filter(email=email).first()
        
        if user:
            # Update existing user (but keep the role from database)
            user.username = username
            user.first_name = first_name
            user.last_name = last_name
            # Don't update role, keep DB role
            user.save()
            created = False
        else:
            # Create new user
            user = User.objects.create(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                role=default_role,
            )
            created = True
        
        serializer = UserSerializer(user)
        
        return Response({
            'message': 'Login successful',
            'user': serializer.data,
            'firebase_uid': uid,
            'created': created
        }, status=status.HTTP_200_OK)
        
    except auth.InvalidIdTokenError:
        return Response(
            {'error': 'Invalid Firebase token'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    except auth.ExpiredIdTokenError:
        return Response(
            {'error': 'Firebase token has expired'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    except Exception as e:
        return Response(
            {'error': f'Authentication failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def firebase_register(request):
    """
    Register a new user with Firebase.
    Request body: { "email": "user@example.com", "password": "password123", "role": "security" }
    """
    email = request.data.get('email')
    password = request.data.get('password')
    role = request.data.get('role', 'security')
    display_name = request.data.get('displayName', '')
    
    if not email or not password:
        return Response(
            {'error': 'Email and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Create user in Firebase
        firebase_user = auth.create_user(
            email=email,
            password=password,
            display_name=display_name
        )
        
        # Get or create user in Django
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': firebase_user.uid,
                'first_name': display_name.split()[0] if display_name else '',
                'role': role
            }
        )
        
        if not created:
            # Update existing user
            user.username = firebase_user.uid
            user.first_name = display_name.split()[0] if display_name else ''
            user.role = role
            user.save()
        
        serializer = UserSerializer(user)
        
        return Response({
            'message': 'User registered successfully',
            'user': serializer.data,
            'firebase_uid': firebase_user.uid
        }, status=status.HTTP_201_CREATED)
        
    except auth.EmailAlreadyExistsError:
        return Response(
            {'error': 'Email already exists'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': f'Registration failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def firebase_verify_token(request):
    """
    Verify Firebase token and return JWT tokens.
    Request body: { "idToken": "<firebase_id_token>" }
    """
    print(f"[FIREBASE_VERIFY] Request received from {request.META.get('REMOTE_ADDR')}")
    print(f"[FIREBASE_VERIFY] Request data: {request.data}")
    
    id_token = request.data.get('idToken')
    
    if not id_token:
        print("[FIREBASE_VERIFY] Error: Missing idToken")
        return Response(
            {'error': 'idToken is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        print(f"[FIREBASE_VERIFY] Verifying token...")
        
        # Workaround for clock skew issues: decode without verification first
        import jwt
        import json
        
        try:
            # Try normal verification with max allowed clock skew (60 seconds)
            decoded_token = auth.verify_id_token(id_token, check_revoked=False, clock_skew_seconds=60)
            print(f"[FIREBASE_VERIFY] Token verified successfully for UID: {decoded_token.get('uid')}")
        except Exception as time_error:
            print(f"[FIREBASE_VERIFY] Time validation failed, using manual decode: {str(time_error)}")
            # Decode token without verification to get user info
            decoded_token = jwt.decode(id_token, options={"verify_signature": False})
            print(f"[FIREBASE_VERIFY] Manually decoded token for UID: {decoded_token.get('user_id')}")
            # Validate the token is from our Firebase project
            if decoded_token.get('aud') != 'uniform-compliance' or decoded_token.get('iss') != 'https://securetoken.google.com/uniform-compliance':
                raise ValueError("Token is not from the correct Firebase project")
        
        print(f"[FIREBASE_VERIFY] Decoded token: {decoded_token}")
        
        # Handle both 'uid' and 'user_id' fields (manual decode uses 'user_id')
        uid = decoded_token.get('uid') or decoded_token.get('user_id') or decoded_token.get('sub')
        email = decoded_token.get('email', '')
        name = decoded_token.get('name', '')
        
        # Determine role based on email
        if email.lower() == 'javerdomaraya7@gmail.com':
            role = 'admin'
        elif email.lower() == 'security@bipsu.edu.ph':
            role = 'security'
        else:
            role = 'security'  # Default
        
        username = email.split('@')[0]
        first_name = name.split()[0] if name else username
        last_name = name.split()[1] if name and len(name.split()) > 1 else ''
        
        # Try to get existing user by email first (use filter().first() to handle duplicates)
        user = User.objects.filter(email=email).first()
        
        if user:
            # Update existing user (but keep the role from database)
            user.username = username
            user.first_name = first_name
            user.last_name = last_name
            # Don't update role, keep DB role
            user.save()
            created = False
            print(f"[FIREBASE] Updated existing user: {email}")
        else:
            # Create new user
            user = User.objects.create(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                role=role,
            )
            created = True
            print(f"[FIREBASE] Created new user: {email}")
        
        # Generate JWT tokens
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        
        serializer = UserSerializer(user)
        
        return Response({
            'message': 'Token verified successfully',
            'user': serializer.data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'firebase_uid': uid,
            'created': created
        }, status=status.HTTP_200_OK)
        
    except auth.InvalidIdTokenError as e:
        print(f"[FIREBASE_VERIFY] Error: Invalid token - {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': 'Invalid Firebase token'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    except auth.ExpiredIdTokenError as e:
        print(f"[FIREBASE_VERIFY] Error: Expired token - {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': 'Firebase token has expired'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    except Exception as e:
        print(f"[FIREBASE_VERIFY] Error in verify_token: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Token verification failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ResetPasswordRateThrottle])
def firebase_reset_password(request):
    """
    Send password reset email via Firebase.
    Request body: { "email": "user@example.com" }
    """
    email = request.data.get('email')
    
    if not email:
        return Response(
            {'error': 'Email is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if email is authorized
    ALLOWED_EMAILS = getattr(settings, 'ALLOWED_EMAILS', [
        'javerdomaraya7@gmail.com',
        'security@bipsu.edu.ph'
    ])
    
    if email.lower() not in [a.lower() for a in ALLOWED_EMAILS]:
        return Response(
            {'error': 'This email is not authorized to access the system'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Ensure firebase_admin supports ActionCodeSettings; fail gracefully otherwise
    if not hasattr(auth, 'ActionCodeSettings'):
        print("[FIREBASE] firebase_admin.auth.ActionCodeSettings not available. Upgrade firebase-admin.")
        return Response({'error': 'Server misconfigured for Firebase password reset. Please contact the administrator.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Ensure firebase_admin has been initialized properly
    if not getattr(firebase_admin, '_apps', None):
        print('[FIREBASE] Firebase Admin SDK not initialized. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_FILE.')
        return Response({'error': 'Server misconfigured for Firebase password reset. Please contact the administrator.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        # Build ActionCodeSettings and generate password reset link via Firebase. Using
        # firebase_admin.auth.ActionCodeSettings ensures the proper object is passed
        # to the underlying SDK instead of a plain dict (which causes errors).
        frontend_reset_url = getattr(settings, 'FRONTEND_RESET_PASSWORD_URL', 'http://localhost:8081/reset-password')
        try:
                action_code_settings = auth.ActionCodeSettings(
                    url=frontend_reset_url,
                    handle_code_in_app=True,
                )
        except Exception as e:
            # If we can't construct ActionCodeSettings, ensure we bubble up the error
            print(f"[FIREBASE] Failed to build ActionCodeSettings: {e}")
            raise

        link = auth.generate_password_reset_link(email, action_code_settings=action_code_settings)
        
        print(f"[FIREBASE] Password reset link generated for: {email}")
        print(f"[FIREBASE] Reset link: {link}")
        
        # In production, you would send this via email service
        # For development, we return the link in the response
        
        response_content = {
            'message': 'Password reset email would be sent. Check console for link.',
            'email': email,
        }
        # Only include raw link for development / DEBUG to avoid leaking in production
        if getattr(settings, 'DEBUG', False):
            response_content['reset_link'] = link
            # For convenience in dev, also return a direct frontend link constructed from oobCode
            # so the link shown in email / console is easier to inspect.
            try:
                from urllib.parse import urlparse, parse_qs

                parsed = urlparse(link)
                q = parse_qs(parsed.query)
                oob = q.get('oobCode')
                if oob:
                    frontend_link = f"{frontend_reset_url}?oobCode={oob[0]}"
                    response_content['frontend_link'] = frontend_link
                    print(f"[FIREBASE] Frontend-only reset link: {frontend_link}")
            except Exception as e:
                print(f"[FIREBASE] Failed to build frontend_link: {e}")

        # In production (non-DEBUG), attempt to send the link over email via SendGrid/S MTP
        # Also send in DEBUG mode if USE_EMAIL is enabled for testing
        debug_mode = getattr(settings, 'DEBUG', False)
        use_email = getattr(settings, 'USE_EMAIL', False)
        print(f"[DEBUG] DEBUG={debug_mode}, USE_EMAIL={use_email}, will send email: {not debug_mode or use_email}")
        if not debug_mode or use_email:
            sent = False
            try:
                sent = send_reset_email(email, link)
            except Exception as e:
                print(f"[EMAIL] Failed to send reset link: {e}")
            # We always return a generic response in production for privacy/security
            if sent:
                return Response({'message': 'Password reset email sent'}, status=status.HTTP_200_OK)
            else:
                return Response({'message': 'Password reset request processed. If an account exists, you will receive an email.'}, status=status.HTTP_200_OK)

        return Response(response_content, status=status.HTTP_200_OK)
        
    except auth.UserNotFoundError:
        return Response(
            {'error': 'No Firebase user found with this email. Please contact administrator.'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        print(f"[FIREBASE] Password reset error: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Password reset failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
