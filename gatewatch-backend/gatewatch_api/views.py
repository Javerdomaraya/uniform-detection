from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework.generics import ListAPIView
from rest_framework import viewsets
from .models import Student, DetectionLog, User, Camera
from .serializers import DetectionLogSerializer, TodayStatsSerializer, RecentAlertSerializer, UserSerializer, CameraSerializer
from .permissions import IsAdminUser, IsSecurityUser
from django.db.models import Count
from django.db.models import Max
from datetime import date

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]  # Admin-only access

    def get(self, request):
        today = date.today()

        # Use Django's ORM to count the data
        compliant = DetectionLog.objects.filter(timestamp__date=today, status='compliant').count()
        non_compliant = DetectionLog.objects.filter(timestamp__date=today, status='non-compliant').count()
        alerts = DetectionLog.objects.filter(timestamp__date=today, status='alert').count()
        total_students_logged = compliant + non_compliant + alerts

        stats = {
            'totalStudents': total_students_logged,
            'compliant': compliant,
            'nonCompliant': non_compliant,
            'activeAlerts': alerts
        }
        return Response(stats, status=status.HTTP_200_OK)

class RecentLogsView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        # Fetch the 10 most recent logs
        recent_logs = DetectionLog.objects.order_by('-timestamp')[:10]
        serializer = DetectionLogSerializer(recent_logs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class SecurityStatsView(APIView):
    permission_classes = []  # Temporarily allow unauthenticated access for testing

    def get(self, request):
        today = date.today()

        compliant = DetectionLog.objects.filter(timestamp__date=today, status='compliant').count()
        non_compliant = DetectionLog.objects.filter(timestamp__date=today, status='non-compliant').count()
        total_detections = compliant + non_compliant

        stats = {
            'compliant': compliant,
            'nonCompliant': non_compliant,
            'totalDetections': total_detections,
        }

        serializer = TodayStatsSerializer(stats)
        return Response(serializer.data, status=status.HTTP_200_OK)

class RecentAlertsView(APIView):
    permission_classes = []  # Temporarily allow unauthenticated access for testing

    def get(self, request):
        # Fetch the most recent 5 non-compliant logs
        recent_alerts = DetectionLog.objects.filter(status='non-compliant').order_by('-timestamp')[:5]

        serializer = RecentAlertSerializer(recent_alerts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class CameraDetectionsView(APIView):
    permission_classes = [IsAuthenticated, IsSecurityUser]

    def get(self, request):
        # Find the latest detection time for each unique camera location
        latest_detections = DetectionLog.objects.values('location').annotate(last_detection=Max('timestamp'))

        # Format the data to match frontend expectations
        formatted_data = []
        for det in latest_detections:
            formatted_data.append({
                'camera': det['location'],
                'last_detection': det['last_detection'].strftime("%H:%M:%S")
            })

        return Response(formatted_data, status=status.HTTP_200_OK)

class GetUserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # The `request.user` is automatically populated by JWTAuthentication
        user_data = UserSerializer(request.user).data
        return Response(user_data, status=status.HTTP_200_OK)

class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = User.objects.all().order_by('id')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    # You can customize methods, e.g., to handle password updates
    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Manually handle password hashing if provided
        if 'password' in request.data:
            user.set_password(request.data['password'])
            user.save()

        self.perform_update(serializer)
        return Response(serializer.data)

class ComplianceLogListView(ListAPIView):
    """
    API endpoint that returns a list of all compliance logs.
    """
    queryset = DetectionLog.objects.all().order_by('-timestamp')
    serializer_class = DetectionLogSerializer
    permission_classes = [IsAuthenticated]

class CameraViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows cameras to be viewed or edited.
    Only security personnel can manage cameras.
    """
    queryset = Camera.objects.all().order_by('name')
    serializer_class = CameraSerializer
    # Temporarily allow unauthenticated access for testing
    permission_classes = []  # [IsAuthenticated, IsSecurityUser]

    def perform_create(self, serializer):
        """
        Override to add any custom logic when creating a camera
        """
        serializer.save()

    def perform_update(self, serializer):
        """
        Override to add any custom logic when updating a camera
        """
        serializer.save()


class CameraConnectionTestView(APIView):
    """
    Test view to check if a camera URL is accessible
    """
    permission_classes = []  # Allow unauthenticated access for testing

    def post(self, request):
        """
        Test camera connection without registering it
        """
        camera_url = request.data.get('url', '')
        if not camera_url:
            return Response({'error': 'Camera URL is required'}, status=400)

        try:
            import requests
            print(f"[TEST] Testing camera connection: {camera_url}")

            # Try to connect to the camera
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }

            response = requests.get(camera_url, timeout=10, headers=headers, verify=False)

            result = {
                'url': camera_url,
                'status_code': response.status_code,
                'accessible': response.status_code == 200,
                'content_type': response.headers.get('content-type', 'unknown'),
                'response_time': 'N/A'  # Could add timing if needed
            }

            if response.status_code == 200:
                print(f"[SUCCESS] Camera test successful: {camera_url}")
                result['message'] = 'Camera is accessible and responding correctly'
            else:
                print(f"[WARNING] Camera test returned status {response.status_code}: {camera_url}")
                result['message'] = f'Camera returned status {response.status_code}'

            response.close()
            return Response(result)

        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Camera test failed: {str(e)}")
            return Response({
                'url': camera_url,
                'accessible': False,
                'error': str(e),
                'message': 'Camera is not accessible'
            }, status=502)


class CameraStreamProxyView(APIView):
    """
    Proxy view that forwards camera streams to avoid CORS issues
    """
    permission_classes = []  # Allow unauthenticated access for stream viewing

    def get(self, request, camera_id):
        """
        Proxy the camera stream through Django to avoid CORS issues
        """
        try:
            # Get the camera from database
            print(f"[CAMERA] Looking up camera ID: {camera_id}")
            camera = Camera.objects.get(id=camera_id, is_active=True)
            print(f"[CAMERA] Found camera: {camera.name} (active: {camera.is_active})")

            # Special handling for test URLs
            print(f"[CAMERA] Checking stream URL: '{camera.stream_url}' (type: {type(camera.stream_url)})")
            if camera.stream_url == 'test':
                print(f"[CAMERA] Test camera detected for: {camera.name}")
                # Return a simple test response for testing
                from django.http import HttpResponse
                return HttpResponse(
                    '<html><body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh;">'
                    '<div style="max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.1); padding: 40px; border-radius: 20px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);">'
                    '<h1 style="font-size: 3em; margin-bottom: 20px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">📹 Test Camera</h1>'
                    '<div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 10px; margin: 20px 0;">'
                    f'<p style="font-size: 1.2em; margin: 10px 0;"><strong>Camera Name:</strong> {camera.name}</p>'
                    f'<p style="font-size: 1.2em; margin: 10px 0;"><strong>Location:</strong> {camera.location or "Test Location"}</p>'
                    '<p style="font-size: 1.2em; margin: 10px 0;"><strong>Status:</strong> <span style="color: #4CAF50; font-weight: bold;">● ACTIVE</span></p>'
                    '</div>'
                    '<p style="font-size: 1.1em; opacity: 0.9;">This is a test camera stream for development and testing purposes.</p>'
                    '<div style="margin-top: 30px; padding: 15px; background: rgba(76, 175, 80, 0.2); border-radius: 10px; border-left: 4px solid #4CAF50;">'
                    '<p style="margin: 0; font-weight: bold;">✅ Test Camera Working!</p>'
                    '<p style="margin: 5px 0 0 0; font-size: 0.9em; opacity: 0.8;">The camera streaming system is functioning correctly.</p>'
                    '</div>'
                    '</div></body></html>',
                    content_type='text/html'
                )

            # Fetch the stream from the camera's URL
            import requests
            from django.http import StreamingHttpResponse, HttpResponse

            print(f"[CAMERA] Attempting to connect to camera: {camera.name}")
            print(f"[CAMERA] Camera URL: {camera.stream_url}")
            print(f"[CAMERA] Camera Location: {camera.location}")

            # Determine camera type and adjust request accordingly
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }

            # For Android IP Webcam, try different endpoints with authentication support
            if '8080' in camera.stream_url and ('http://' in camera.stream_url or 'https://' in camera.stream_url):
                print("[CAMERA] Detected Android IP Webcam format")

                # Extract credentials from URL if present (format: http://username:password@ip:port/video)
                camera_url = camera.stream_url
                username = None
                password = None

                if '@' in camera_url:
                    # Parse URL with credentials: http://username:password@ip:port/video
                    try:
                        from urllib.parse import urlparse
                        parsed = urlparse(camera_url)
                        if parsed.username and parsed.password:
                            username = parsed.username
                            password = parsed.password
                            # Reconstruct URL without credentials for requests
                            camera_url = f"{parsed.scheme}://{parsed.hostname}:{parsed.port}{parsed.path}"
                            print(f"[CAMERA] Found credentials for user: {username}")
                    except Exception as e:
                        print(f"[CAMERA] Error parsing credentials: {str(e)}")

                # Try multiple common Android IP Webcam endpoints
                possible_urls = [
                    camera_url,  # Original URL
                    camera_url.rstrip('/') + '/video',  # /video endpoint
                    camera_url.rstrip('/') + '/stream',  # /stream endpoint
                ]

                for url in possible_urls:
                    try:
                        print(f"[CAMERA] Trying URL: {url}")

                        # Prepare authentication if credentials provided
                        auth = None
                        if username and password:
                            from requests.auth import HTTPDigestAuth
                            auth = HTTPDigestAuth(username, password)
                            print(f"[CAMERA] Using HTTP Digest Auth for user: {username}")

                        response = requests.get(url, stream=True, timeout=15, headers=headers, verify=False, auth=auth)

                        if response.status_code == 200:
                            print(f"[CAMERA] Successfully connected to: {url}")
                            break
                        elif response.status_code == 401:
                            print(f"[CAMERA] Authentication required for: {url}")
                            response.close()
                            continue
                        else:
                            print(f"[CAMERA] URL returned status {response.status_code}: {url}")
                            response.close()
                            continue
                    except requests.exceptions.RequestException as e:
                        print(f"[CAMERA] Failed to connect to {url}: {str(e)}")
                        continue
                else:
                    # If none of the URLs worked, return an error
                    return HttpResponse(
                        f'<html><body style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f8f9fa;">'
                        f'<div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">'
                        f'<h2 style="color: #dc3545; margin-bottom: 20px;">❌ Camera Connection Failed</h2>'
                        f'<div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">'
                        f'<p><strong>📹 Camera:</strong> {camera.name}</p>'
                        f'<p><strong>🔗 URL:</strong> {camera.stream_url}</p>'
                        f'<p><strong>📍 Location:</strong> {camera.location or "Not specified"}</p>'
                        f'</div>'
                        f'<p style="color: #6c757d; margin-bottom: 20px;"><strong>🔧 Troubleshooting Steps:</strong></p>'
                        f'<ol style="text-align: left; color: #495057; line-height: 1.6;">'
                        f'<li>📱 <strong>Android Device:</strong> Make sure IP Webcam app is running and streaming</li>'
                        f'<li>🌐 <strong>Network:</strong> Ensure both devices are on the same WiFi network</li>'
                        f'<li>🔍 <strong>Test URL:</strong> Try accessing <a href="{camera.stream_url}" target="_blank" style="color: #007bff;">{camera.stream_url}</a> directly in your browser</li>'
                        f'<li>⚙️ <strong>Port:</strong> Verify the camera is using port 8080</li>'
                        f'<li>🔒 <strong>Firewall:</strong> Check if firewall is blocking the connection</li>'
                        f'<li>📶 <strong>IP Address:</strong> Confirm the IP address {camera.stream_url.split("//")[1].split(":")[0]} is correct</li>'
                        f'</ol>'
                        f'<div style="background: #e9ecef; padding: 15px; border-radius: 5px; margin-top: 20px;">'
                        f'<p style="margin: 0; color: #495057;"><strong>💡 Tip:</strong> If using Android IP Webcam, make sure the "Start Server" button is pressed and the video stream is active.</p>'
                        f'</div>'
                        f'</div></body></html>',
                        content_type='text/html',
                        status=502
                    )

            else:
                # For other camera types (IP cameras, RTSP, etc.)
                print("[CAMERA] Detected IP Camera or other format")
                try:
                    response = requests.get(camera.stream_url, stream=True, timeout=15, headers=headers, verify=False)
                except requests.exceptions.RequestException as e:
                    print(f"[CAMERA] Failed to connect to camera: {str(e)}")
                    return HttpResponse(
                        f'<html><body style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f8f9fa;">'
                        f'<div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">'
                        f'<h2 style="color: #dc3545; margin-bottom: 20px;">❌ Camera Connection Failed</h2>'
                        f'<div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">'
                        f'<p><strong>📹 Camera:</strong> {camera.name}</p>'
                        f'<p><strong>🔗 URL:</strong> {camera.stream_url}</p>'
                        f'<p><strong>📍 Location:</strong> {camera.location or "Not specified"}</p>'
                        f'<p><strong>⚠️ Error:</strong> {str(e)}</p>'
                        f'</div>'
                        f'<p style="color: #6c757d; margin-bottom: 20px;"><strong>🔧 Troubleshooting Steps:</strong></p>'
                        f'<ol style="text-align: left; color: #495057; line-height: 1.6;">'
                        f'<li>🔌 <strong>Power:</strong> Check if the camera is powered on and connected</li>'
                        f'<li>🌐 <strong>Network:</strong> Verify the camera is on the same network as the server</li>'
                        f'<li>🔍 <strong>Test URL:</strong> Try accessing <a href="{camera.stream_url}" target="_blank" style="color: #007bff;">{camera.stream_url}</a> directly in your browser</li>'
                        f'<li>🔐 <strong>Authentication:</strong> For RTSP cameras, ensure proper authentication is included in the URL</li>'
                        f'<li>⚙️ <strong>Configuration:</strong> Check camera settings and streaming configuration</li>'
                        f'<li>🔥 <strong>Firewall:</strong> Ensure no firewall is blocking the connection</li>'
                        f'</ol>'
                        f'<div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin-top: 20px;">'
                        f'<p style="margin: 0; color: #155724;"><strong>💡 Pro Tip:</strong> For IP cameras, try using the camera\'s web interface first to verify it\'s streaming correctly.</p>'
                        f'</div>'
                        f'</div></body></html>',
                        content_type='text/html',
                        status=502
                    )

            # Check if request was successful
            if response.status_code != 200:
                print(f"[CAMERA] Camera returned status {response.status_code}")
                return HttpResponse(
                    f'<html><body style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f8f9fa;">'
                    f'<div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">'
                    f'<h2 style="color: #dc3545; margin-bottom: 20px;">❌ Camera Error</h2>'
                    f'<div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">'
                    f'<p><strong>📹 Camera:</strong> {camera.name}</p>'
                    f'<p><strong>🔗 URL:</strong> {camera.stream_url}</p>'
                    f'<p><strong>📍 Location:</strong> {camera.location or "Not specified"}</p>'
                    f'<p><strong>⚠️ Status:</strong> HTTP {response.status_code}</p>'
                    f'</div>'
                    f'<p style="color: #6c757d; margin-bottom: 20px;"><strong>🔧 Possible Solutions:</strong></p>'
                    f'<ol style="text-align: left; color: #495057; line-height: 1.6;">'
                    f'<li>🔍 <strong>Check Camera Status:</strong> Verify the camera is online and streaming</li>'
                    f'<li>🌐 <strong>Network Access:</strong> Ensure the camera is accessible from the server</li>'
                    f'<li>🔐 <strong>Authentication:</strong> Check if the camera requires login credentials</li>'
                    f'<li>⚙️ <strong>Camera Settings:</strong> Verify streaming settings in camera configuration</li>'
                    f'<li>🔄 <strong>Restart Camera:</strong> Try restarting the camera or streaming service</li>'
                    f'</ol>'
                    f'<div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin-top: 20px;">'
                    f'<p style="margin: 0; color: #856404;"><strong>💡 Note:</strong> HTTP {response.status_code} usually indicates the camera is reachable but not configured to stream properly.</p>'
                    f'</div>'
                    f'</div></body></html>',
                    content_type='text/html',
                    status=502
                )

            print(f"[CAMERA] Camera connection successful! Status: {response.status_code}")

            # Get content type from response
            content_type = response.headers.get('content-type', 'video/mp4')
            print(f"[CAMERA] Content type: {content_type}")

            # For MJPEG streams, we need to handle them differently
            if 'multipart/x-mixed-replace' in content_type or 'image/jpeg' in content_type:
                print("[CAMERA] Detected MJPEG stream")
                # For MJPEG, we might need to serve it as an image stream
                content_type = 'multipart/x-mixed-replace; boundary=frame'

            # Create streaming response
            streaming_response = StreamingHttpResponse(
                response.iter_content(chunk_size=8192),
                content_type=content_type,
                status=response.status_code
            )

            # Copy relevant headers
            headers_to_copy = ['content-type', 'content-length', 'cache-control', 'content-disposition']
            for header in headers_to_copy:
                if header in response.headers:
                    streaming_response[header] = response.headers[header]

            print("[CAMERA] Starting video stream...")
            return streaming_response

        except Camera.DoesNotExist:
            print(f"[CAMERA] Camera not found: ID {camera_id}")
            return HttpResponse(
                f'<html><body style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f8f9fa;">'
                f'<div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">'
                f'<h2 style="color: #dc3545; margin-bottom: 20px;">❌ Camera Not Found</h2>'
                f'<div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">'
                f'<p><strong>📹 Camera ID:</strong> {camera_id}</p>'
                f'<p><strong>⚠️ Status:</strong> Camera not found or inactive</p>'
                f'</div>'
                f'<p style="color: #6c757d; margin-bottom: 20px;"><strong>🔧 Possible Causes:</strong></p>'
                f'<ul style="text-align: left; color: #495057; line-height: 1.6;">'
                f'<li>🗑️ <strong>Deleted:</strong> The camera may have been deleted from the system</li>'
                f'<li>🚫 <strong>Deactivated:</strong> The camera may be marked as inactive</li>'
                f'<li>🔗 <strong>Invalid ID:</strong> The camera ID may be incorrect</li>'
                f'</ul>'
                f'<div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin-top: 20px;">'
                f'<p style="margin: 0; color: #0c5460;"><strong>💡 Solution:</strong> Try refreshing the page or re-registering the camera in the Security Dashboard.</p>'
                f'</div>'
                f'</div></body></html>',
                content_type='text/html',
                status=404
            )
        except Exception as e:
            print(f"[ERROR] Unexpected error in camera proxy: {str(e)}")
            import traceback
            traceback.print_exc()

            return HttpResponse(
                f'<html><body style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f8f9fa;">'
                f'<div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">'
                f'<h2 style="color: #dc3545; margin-bottom: 20px;">❌ Internal Server Error</h2>'
                f'<div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">'
                f'<p><strong>⚠️ Error:</strong> {str(e)}</p>'
                f'<p><strong>📍 Location:</strong> Camera streaming proxy</p>'
                f'</div>'
                f'<p style="color: #6c757d; margin-bottom: 20px;"><strong>🔧 What to do:</strong></p>'
                f'<ol style="text-align: left; color: #495057; line-height: 1.6;">'
                f'<li>🔄 <strong>Refresh:</strong> Try refreshing the page</li>'
                f'<li>🐛 <strong>Report:</strong> Check the Django server logs for detailed error information</li>'
                f'<li>⚙️ <strong>Restart:</strong> Try restarting the Django server if the issue persists</li>'
                f'</ol>'
                f'<div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin-top: 20px;">'
                f'<p style="margin: 0; color: #721c24;"><strong>🚨 Note:</strong> This is an unexpected server error. Please contact the system administrator if this persists.</p>'
                f'</div>'
                f'</div></body></html>',
                content_type='text/html',
                status=500
            )

