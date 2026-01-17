from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework.generics import ListAPIView
from rest_framework import viewsets
from .models import Student, DetectionLog, User, Camera, ViolationSnapshot, ComplianceDetection
from .serializers import DetectionLogSerializer, TodayStatsSerializer, RecentAlertSerializer, UserSerializer, CameraSerializer, ComplianceDetectionSerializer
from .permissions import IsAdminUser, IsSecurityUser
from django.db.models import Count
from django.db.models import Max
from datetime import date, datetime, timedelta
from django.utils import timezone
from pathlib import Path
import sys
import time
from collections import defaultdict

# Import DeepSort for person tracking
try:
    from deep_sort_realtime.deepsort_tracker import DeepSort
    DEEPSORT_AVAILABLE = True
    print("[DEEPSORT] deep-sort-realtime imported successfully", flush=True)
except ImportError:
    DEEPSORT_AVAILABLE = False
    print("[WARNING] deep-sort-realtime not installed. Tracking disabled. Install with: pip install deep-sort-realtime", flush=True)

_yolo_model = None
_yolo_model_lock = None

_deepsort_trackers = {}
_deepsort_lock = None
_tracked_violations = {}

active_streams = {}

def get_yolo_model():
    global _yolo_model, _yolo_model_lock

    # Initialize lock on first call
    if _yolo_model_lock is None:
        import threading
        _yolo_model_lock = threading.Lock()

    if _yolo_model is None:
        with _yolo_model_lock:
            # Double-check after acquiring lock
            if _yolo_model is None:
                try:
                    from ultralytics import YOLO
                    # best.pt is in the root of gatewatch-backend
                    model_path = Path(__file__).resolve().parent.parent / 'best.pt'
                    print(f"[YOLO] Loading model from: {model_path}", flush=True)

                    # Load YOLO model with GPU support if available
                    _yolo_model = YOLO(str(model_path))

                    # Check if CUDA is available and move model to GPU
                    try:
                        import torch
                        if torch.cuda.is_available():
                            _yolo_model.to('cuda')
                            print(f"[YOLO] ✅ Model moved to GPU (CUDA available)", flush=True)
                        else:
                            print(f"[YOLO] ⚠️ CUDA not available, using CPU", flush=True)
                    except ImportError:
                        print(f"[YOLO] ⚠️ PyTorch not available for GPU check, using default device", flush=True)

                    print(f"[YOLO] Model loaded successfully", flush=True)
                    print(f"[YOLO] Model classes: {_yolo_model.names}", flush=True)
                except Exception as e:
                    print(f"[YOLO] Error loading model: {str(e)}", flush=True)
                    raise
    return _yolo_model

def get_deepsort_tracker(camera_id):
    global _deepsort_trackers, _deepsort_lock
    
    if not DEEPSORT_AVAILABLE:
        return None
    
    # Initialize lock on first call
    if _deepsort_lock is None:
        import threading
        _deepsort_lock = threading.Lock()
    
    if camera_id not in _deepsort_trackers:
        with _deepsort_lock:
            if camera_id not in _deepsort_trackers:
                try:
                    # Initialize DeepSort with optimized parameters
                    _deepsort_trackers[camera_id] = DeepSort(
                        max_age=30,              # Frames to keep alive lost tracks
                        n_init=3,                # Frames to confirm a track
                        nms_max_overlap=1.0,     # NMS threshold
                        max_cosine_distance=0.3, # Appearance similarity threshold
                        nn_budget=None,          # No limit on appearance samples
                        embedder="mobilenet",    # Feature extractor (fast)
                        half=True,               # Use FP16 for speed
                        bgr=True,                # OpenCV uses BGR
                        embedder_gpu=True        # Use GPU if available
                    )
                    _tracked_violations[camera_id] = {}  # Track recorded violations
                    print(f"[DEEPSORT] ✅ Initialized tracker for Camera {camera_id}", flush=True)
                except Exception as e:
                    print(f"[DEEPSORT] ❌ Error initializing tracker: {str(e)}", flush=True)
                    _deepsort_trackers[camera_id] = None
    return _deepsort_trackers[camera_id]

def cleanup_camera_tracker(camera_id):
    global _deepsort_trackers, _tracked_violations
    
    if camera_id in _deepsort_trackers:
        del _deepsort_trackers[camera_id]
        print(f"[DEEPSORT] Cleaned up tracker for Camera {camera_id}", flush=True)
    
    if camera_id in _tracked_violations:
        count = len(_tracked_violations[camera_id])
        del _tracked_violations[camera_id]
        print(f"[DEEPSORT] Cleared {count} tracked violations for Camera {camera_id}", flush=True)

class DashboardStatsView(APIView):
    permission_classes = []  # Temporarily allow unauthenticated access for testing
    authentication_classes = []

    def get(self, request):
        # Get stats for the last 24 hours
        from datetime import timedelta
        from .models import ComplianceDetection
        
        last_24_hours = timezone.now() - timedelta(hours=24)

        # Count detections from ComplianceDetection model
        compliant = ComplianceDetection.objects.filter(
            timestamp__gte=last_24_hours,
            status='compliant'
        ).count()
        
        non_compliant = ComplianceDetection.objects.filter(
            timestamp__gte=last_24_hours,
            status='non-compliant'
        ).count()
        
        # Total students = all detections
        total_students_logged = compliant + non_compliant

        # Violation snapshot stats for pending items
        pending_identification = ViolationSnapshot.objects.filter(identified=False).count()
        repeat_offenders = ViolationSnapshot.objects.filter(
            identified=True,
            sent_to_admin=True,
            reviewed=False
        ).values('student_name').distinct().count()

        stats = {
            'totalStudents': total_students_logged,
            'compliant': compliant,
            'nonCompliant': non_compliant,
            'activeAlerts': pending_identification + repeat_offenders
        }
        return Response(stats, status=status.HTTP_200_OK)

class RecentLogsView(APIView):
    permission_classes = []  # Temporarily allow unauthenticated access for testing
    authentication_classes = []

    def get(self, request):
        # Fetch the 10 most recent logs
        recent_logs = DetectionLog.objects.order_by('-timestamp')[:10]
        serializer = DetectionLogSerializer(recent_logs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class SecurityStatsView(APIView):
    permission_classes = []  # Temporarily allow unauthenticated access for testing
    authentication_classes = []

    def get(self, request):
        # Get optional time_range parameter (default: 24h)
        from datetime import timedelta
        from .models import ComplianceDetection
        
        time_range = request.query_params.get('range', '24h')
        now = timezone.now()
        
        # Calculate time ranges based on parameter
        if time_range == 'today':
            # Calendar day (resets at midnight)
            start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
            prev_start = start_time - timedelta(days=1)
            prev_end = start_time
        elif time_range == '7d':
            # Last 7 days (rolling)
            start_time = now - timedelta(days=7)
            prev_start = now - timedelta(days=14)
            prev_end = start_time
        elif time_range == '30d':
            # Last 30 days (rolling)
            start_time = now - timedelta(days=30)
            prev_start = now - timedelta(days=60)
            prev_end = start_time
        elif time_range == '1y':
            # Last year (rolling)
            start_time = now - timedelta(days=365)
            prev_start = now - timedelta(days=730)
            prev_end = start_time
        else:  # '24h' default
            # Last 24 hours (rolling)
            start_time = now - timedelta(hours=24)
            prev_start = now - timedelta(hours=48)
            prev_end = start_time
        
        # Current period stats
        compliant = ComplianceDetection.objects.filter(
            timestamp__gte=start_time,
            status='compliant'
        ).count()
        
        non_compliant = ComplianceDetection.objects.filter(
            timestamp__gte=start_time,
            status='non-compliant'
        ).count()
        
        total_detections = compliant + non_compliant
        
        # Previous period stats (for trend calculation)
        prev_compliant = ComplianceDetection.objects.filter(
            timestamp__gte=prev_start,
            timestamp__lt=prev_end,
            status='compliant'
        ).count()
        
        prev_non_compliant = ComplianceDetection.objects.filter(
            timestamp__gte=prev_start,
            timestamp__lt=prev_end,
            status='non-compliant'
        ).count()
        
        prev_total = prev_compliant + prev_non_compliant
        
        # Calculate trends (percentage change from previous period)
        total_trend = round(((total_detections - prev_total) / prev_total * 100), 1) if prev_total > 0 else 0
        compliant_trend = round(((compliant - prev_compliant) / prev_compliant * 100), 1) if prev_compliant > 0 else 0
        non_compliant_trend = round(((non_compliant - prev_non_compliant) / prev_non_compliant * 100), 1) if prev_non_compliant > 0 else 0
        
        # Calculate compliance rate
        compliance_rate = round((compliant / total_detections * 100), 1) if total_detections > 0 else 0

        stats = {
            'compliant': compliant,
            'nonCompliant': non_compliant,
            'totalDetections': total_detections,
            'complianceRate': compliance_rate,
            'totalTrend': total_trend,
            'compliantTrend': compliant_trend,
            'nonCompliantTrend': non_compliant_trend,
            'timeRange': time_range,
            'startTime': start_time.isoformat(),
            'endTime': now.isoformat(),
        }

        serializer = TodayStatsSerializer(stats)
        return Response(serializer.data, status=status.HTTP_200_OK)

class RecentAlertsView(APIView):
    permission_classes = []  # Temporarily allow unauthenticated access for testing
    authentication_classes = []

    def get(self, request):
        # Fetch the most recent 5 violation snapshots with non-null cameras
        recent_violations = ViolationSnapshot.objects.filter(camera__isnull=False).order_by('-timestamp')[:5]
        
        # Format data to match frontend expectations
        alerts_data = []
        for violation in recent_violations:
            alerts_data.append({
                'id': violation.id,
                'timestamp': violation.timestamp.strftime("%H:%M:%S"),
                'type': 'Uniform Violation',  # Generic type since ViolationSnapshot doesn't have violation_type
                'camera': violation.camera.name if violation.camera else 'Unknown Camera'
            })

        return Response(alerts_data, status=status.HTTP_200_OK)

class CameraDetectionsView(APIView):
    permission_classes = []  # Temporarily allow unauthenticated access for testing
    authentication_classes = []

    def get(self, request):
        # Find the latest detection time for each camera from ViolationSnapshot
        # Exclude violations with null cameras
        latest_detections = ViolationSnapshot.objects.filter(
            camera__isnull=False
        ).values('camera__name').annotate(
            last_detection=Max('timestamp')
        )

        # Format the data to match frontend expectations
        formatted_data = []
        for det in latest_detections:
            if det['camera__name']:  # Extra safety check
                formatted_data.append({
                    'camera': det['camera__name'],
                    'last_detection': det['last_detection'].strftime("%H:%M:%S")
                })

        return Response(formatted_data, status=status.HTTP_200_OK)

class GetUserProfileView(APIView):
    permission_classes = [IsAuthenticated]
    # Keep authentication enabled for this endpoint since it needs request.user

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
    permission_classes = []  # Temporarily allow unauthenticated access for testing
    authentication_classes = []

class ComplianceDetectionListView(ListAPIView):
    """
    API endpoint that returns a list of all compliance detections (compliant and non-compliant).
    """
    queryset = ComplianceDetection.objects.select_related('camera').all().order_by('-timestamp')
    serializer_class = ComplianceDetectionSerializer
    permission_classes = []  # Temporarily allow unauthenticated access for testing
    authentication_classes = []

class CameraViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows cameras to be viewed or edited.
    Only security personnel can manage cameras.
    """
    queryset = Camera.objects.all().order_by('name')
    serializer_class = CameraSerializer
    # Temporarily allow unauthenticated access for testing
    permission_classes = []  # [IsAuthenticated, IsSecurityUser]
    authentication_classes = []

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


class StartCameraStreamView(APIView):
    """
    Mark a camera as streaming when security personnel start viewing it
    """
    permission_classes = []  # Temporarily allow unauthenticated for testing
    authentication_classes = []

    def post(self, request, camera_id):
        try:
            camera = Camera.objects.get(id=camera_id)
            camera.is_streaming = True
            camera.last_streamed_at = timezone.now()
            # Optionally track which user started the stream (when auth is enabled)
            # camera.last_streamed_by = request.user if request.user.is_authenticated else None
            camera.save()
            
            serializer = CameraSerializer(camera)
            return Response({
                'message': f'Camera {camera.name} stream started',
                'camera': serializer.data
            }, status=status.HTTP_200_OK)
        except Camera.DoesNotExist:
            return Response({'error': 'Camera not found'}, status=status.HTTP_404_NOT_FOUND)


class StopCameraStreamView(APIView):
    """
    Mark a camera as not streaming when security personnel stop viewing it
    """
    permission_classes = []  # Temporarily allow unauthenticated for testing
    authentication_classes = []

    def post(self, request, camera_id):
        try:
            camera = Camera.objects.get(id=camera_id)
            camera.is_streaming = False
            camera.save()
            
            # Stop the active stream thread if it exists
            if camera_id in active_streams:
                stream_info = active_streams[camera_id]
                if 'stop_event' in stream_info:
                    stream_info['stop_event'].set()  # Signal the thread to stop
                    print(f"[CAMERA {camera_id}] Stop signal sent to stream thread", flush=True)
                # Remove from active streams
                active_streams.pop(camera_id, None)
            
            try:
                # Clean up DeepSort tracker for this camera
                cleanup_camera_tracker(camera_id)
            except OSError as e:
                return Response({'error': f'OSError during cleanup: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception as e:
                return Response({'error': f'Error during cleanup: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            serializer = CameraSerializer(camera)
            return Response({
                'message': f'Camera {camera.name} stream stopped',
                'camera': serializer.data
            }, status=status.HTTP_200_OK)
        except Camera.DoesNotExist:
            return Response({'error': 'Camera not found'}, status=status.HTTP_404_NOT_FOUND)


class ActiveCamerasView(APIView):
    """
    Get all currently streaming cameras (for Admin monitoring)
    """
    permission_classes = []  # Temporarily allow unauthenticated for testing
    authentication_classes = []

    def get(self, request):
        active_cameras = Camera.objects.filter(is_streaming=True, is_active=True)
        serializer = CameraSerializer(active_cameras, many=True)
        return Response({
            'count': active_cameras.count(),
            'cameras': serializer.data
        }, status=status.HTTP_200_OK)


class CameraConnectionTestView(APIView):
    """
    Test view to check if a camera URL is accessible
    """
    permission_classes = []  # Allow unauthenticated access for testing
    authentication_classes = []

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

            # Check if this is an RTSP stream - redirect to detection endpoint
            if camera.stream_url.startswith('rtsp://'):
                print(f"[CAMERA] RTSP stream detected, redirecting to detection endpoint")
                from django.http import HttpResponseRedirect
                from django.urls import reverse
                
                # Redirect to the CameraStreamWithDetection endpoint which handles RTSP properly with OpenCV
                detection_url = reverse('camera-stream-detection', kwargs={'camera_id': camera_id})
                return HttpResponseRedirect(detection_url)

            # Fetch the stream from the camera's URL (HTTP/HTTPS only)
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


# New RTSP Camera Stream with YOLO Detection
class CameraStreamWithDetection(APIView):
    """
    Stream RTSP cameras with real-time YOLO uniform detection and violation capture
    """
    permission_classes = []
    authentication_classes = []
    
    def get(self, request, camera_id):
        """Stream camera with YOLO detection"""
        import cv2
        import numpy as np
        from django.http import StreamingHttpResponse, HttpResponse
        from django.core.files.base import ContentFile
        import uuid
        
        try:
            camera = Camera.objects.get(id=camera_id, is_active=True)
        except Camera.DoesNotExist:
            return HttpResponse("Camera not found or inactive", status=404)
        
        print(f"[CAMERA {camera_id}] Starting stream for: {camera.name}", flush=True)
        
        def generate_frames_with_detection():
            """Generator that yields MJPEG frames with YOLO detection and violation capture"""
            cap = None
            frame_count = 0
            
            # Create a stop event for this stream
            import threading
            stop_event = threading.Event()
            active_streams[camera_id] = {'stop_event': stop_event}
            print(f"[CAMERA {camera_id}] Stream registered with stop event", flush=True)
            
            # Stagger camera connections to avoid simultaneous RTSP requests
            stagger_delay = (camera_id % 4) * 0.5
            if stagger_delay > 0:
                print(f"[CAMERA {camera_id}] Staggering connection by {stagger_delay}s", flush=True)
                import time
                time.sleep(stagger_delay)
            
            try:
                # Load YOLO model (singleton, loaded once)
                model = get_yolo_model()
                
                # Try connecting with retries
                max_retries = 3
                for attempt in range(max_retries):
                    print(f"[CAMERA {camera_id}] Connection attempt {attempt + 1}/{max_retries}", flush=True)
                    cap = cv2.VideoCapture(camera.stream_url, cv2.CAP_FFMPEG)
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    
                    if cap.isOpened():
                        print(f"[CAMERA {camera_id}] Connected successfully", flush=True)
                        break
                    
                    print(f"[CAMERA {camera_id}] Connection failed, retrying...", flush=True)
                    if cap:
                        cap.release()
                    import time
                    time.sleep(2)
                else:
                    raise Exception("Failed to connect after retries")
                
                # Aggressively clear initial buffer to reduce lag
                for _ in range(10):
                    cap.grab()
                
                print(f"[CAMERA {camera_id}] Starting detection loop", flush=True)
                
                while True:
                    # Check if stop was requested
                    if stop_event.is_set():
                        print(f"[CAMERA {camera_id}] Stop requested, ending stream", flush=True)
                        break
                    
                    # Check if camera is still active in database
                    camera.refresh_from_db()
                    if not camera.is_active:
                        print(f"[CAMERA {camera_id}] Camera deactivated, ending stream", flush=True)
                        break
                    
                    frame_count += 1
                    
                    # Flush buffer periodically to prevent lag buildup
                    if frame_count % 100 == 0:
                        for _ in range(5):
                            cap.grab()
                    
                    # Process every frame for maximum smoothness (no skipping)
                    # if frame_count % 2 != 0:  # Uncomment to skip every other frame if needed
                    #     if not cap.grab():
                    #         break
                    #     continue
                    
                    ret, frame = cap.read()
                    if not ret:
                        print(f"[CAMERA {camera_id}] Failed to read frame", flush=True)
                        break
                    
                    # Higher resolution for better quality (800x450)
                    display_frame = cv2.resize(frame, (800, 450))

                    # Larger detection frame for better accuracy (416x416)
                    detection_frame = cv2.resize(frame, (416, 416))
                    
                    # Run YOLO detection
                    results = model(detection_frame, conf=0.4, verbose=False)
                    
                    # Get or initialize DeepSort tracker
                    tracker = get_deepsort_tracker(camera_id)
                    
                    if tracker is not None and DEEPSORT_AVAILABLE:
                        # === YOLOV8 + DEEPSORT TRACKING MODE ===
                        
                        # Prepare detections for DeepSort (format: ([x,y,w,h], confidence, class))
                        detections = []
                        for result in results:
                            boxes = result.boxes
                            for box in boxes:
                                # Get box coordinates in detection frame size (320x320)
                                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                                conf = float(box.conf[0])
                                cls = int(box.cls[0])
                                
                                # Convert to [x, y, w, h] format for DeepSort
                                w = x2 - x1
                                h = y2 - y1
                                detections.append(([x1, y1, w, h], conf, cls))
                        
                        # Update tracker with detections
                        tracks = tracker.update_tracks(detections, frame=detection_frame)
                        
                        # Process tracks (not raw detections)
                        active_track_count = 0
                        for track in tracks:
                            if not track.is_confirmed():
                                continue
                            
                            active_track_count += 1
                            track_id = track.track_id
                            ltrb = track.to_ltrb()  # Get [left, top, right, bottom]
                            
                            # Scale coordinates to display frame size (800x450)
                            x1 = int(ltrb[0] * (800 / 416))
                            y1 = int(ltrb[1] * (450 / 416))
                            x2 = int(ltrb[2] * (800 / 416))
                            y2 = int(ltrb[3] * (450 / 416))
                            
                            # Get detection class and confidence
                            det_class = track.det_class if track.det_class is not None else 0
                            det_conf = track.det_conf if track.det_conf is not None else 0.0
                            label = model.names[det_class]
                            
                            # Log tracks for debugging (every 60 frames to reduce spam)
                            if frame_count % 60 == 0:
                                print(f"[CAMERA {camera_id}] Track ID: {track_id}, {label} (conf: {det_conf:.2f})", flush=True)
                            
                            # Color based on detection
                            color = (0, 255, 0) if label == 'Compliant' else (0, 0, 255)
                            
                            # Draw bounding box
                            cv2.rectangle(display_frame, (x1, y1), (x2, y2), color, 2)
                            
                            # Draw label with track ID
                            label_text = f"ID:{track_id} {label} {det_conf:.2f}"
                            (text_width, text_height), baseline = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                            
                            # Draw background rectangle for text (removed to keep label background transparent)
                            # rect_x1 = x1
                            # rect_y1 = y1 - text_height - baseline - 5
                            # rect_x2 = x1 + text_width + 5
                            # rect_y2 = y1 - baseline
                            # cv2.rectangle(display_frame, (rect_x1, rect_y1), (rect_x2, rect_y2), (0, 0, 0), -1)
                            
                            # Draw text
                            text_x = x1 + 2
                            text_y = y1 - baseline - 2
                            cv2.putText(display_frame, label_text, (text_x, text_y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                            
                            # === TRACK-BASED CAPTURE LOGIC ===
                            # Normalize label (Model outputs: {0: 'Compliant', 1: 'Non_compliant'})
                            label_lower = label.lower().replace('-', '_').replace(' ', '_')
                            is_compliant = label_lower == 'compliant'
                            is_non_compliant = label_lower == 'non_compliant'
                            
                            if (is_compliant or is_non_compliant) and det_conf > 0.5:
                                detection_status = 'compliant' if is_compliant else 'non-compliant'
                                track_key = f"{track_id}_{detection_status}"
                                
                                # Check if this track_id has already been recorded
                                if track_key not in _tracked_violations[camera_id]:
                                    try:
                                        snapshot = None
                                        
                                        # For NON-COMPLIANT: Create violation snapshot and upload to Cloudinary
                                        if is_non_compliant and det_conf > 0.6:
                                            # Encode frame as JPEG
                                            _, buffer = cv2.imencode('.jpg', display_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                                            
                                            try:
                                                # Upload to Cloudinary
                                                from io import BytesIO
                                                import cloudinary.uploader
                                                
                                                img_bytes = BytesIO(buffer.tobytes())
                                                upload_result = cloudinary.uploader.upload(
                                                    img_bytes,
                                                    folder="gatewatch/violations",
                                                    resource_type="image",
                                                    format="jpg",
                                                    transformation=[
                                                        {'quality': 'auto:good'},
                                                        {'fetch_format': 'auto'}
                                                    ]
                                                )
                                                
                                                # Create violation snapshot with Cloudinary URL ONLY
                                                snapshot = ViolationSnapshot.objects.create(
                                                    camera_id=camera_id,
                                                    confidence=float(det_conf),
                                                    bbox_x1=x1,
                                                    bbox_y1=y1,
                                                    bbox_x2=x2,
                                                    bbox_y2=y2,
                                                    image_url=upload_result['secure_url'],
                                                    cloudinary_public_id=upload_result['public_id']
                                                )
                                                
                                                print(f"[CAMERA {camera_id}] 🚨 Track ID {track_id}: Violation captured! ID: {snapshot.id}, Conf: {det_conf:.2f}", flush=True)
                                                print(f"[CLOUDINARY] Uploaded: {upload_result['secure_url']}", flush=True)
                                                
                                            except Exception as e:
                                                print(f"[CLOUDINARY] Upload error: {e}", flush=True)
                                                # Fallback: Create snapshot without image if Cloudinary fails
                                                snapshot = ViolationSnapshot.objects.create(
                                                    camera_id=camera_id,
                                                    confidence=float(det_conf),
                                                    bbox_x1=x1,
                                                    bbox_y1=y1,
                                                    bbox_x2=x2,
                                                    bbox_y2=y2
                                                )
                                                print(f"[CAMERA {camera_id}] ⚠️ Track ID {track_id}: Violation captured without image", flush=True)
                                        
                                        # Create compliance detection record
                                        from .models import ComplianceDetection
                                        detection = ComplianceDetection.objects.create(
                                            camera_id=camera_id,
                                            status=detection_status,
                                            confidence=float(det_conf),
                                            violation_snapshot=snapshot if is_non_compliant else None
                                        )
                                        
                                        # Mark track as recorded
                                        _tracked_violations[camera_id][track_key] = detection.id
                                        
                                        if is_compliant:
                                            print(f"[CAMERA {camera_id}] ✅ Track ID {track_id}: Compliant student detected! Conf: {det_conf:.2f}", flush=True)
                                        
                                    except Exception as e:
                                        print(f"[CAMERA {camera_id}] Error saving track {track_id}: {str(e)}", flush=True)
                        
                        # Add tracking mode overlay
                        mode_text = f"Mode: YOLOv8 + DeepSort | Active Tracks: {active_track_count}"
                        cv2.putText(display_frame, mode_text, (10, display_frame.shape[0] - 50),
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
                    
                    else:
                        # === FALLBACK MODE: YOLOV8 ONLY (COOLDOWN-BASED) ===
                        
                        # Process detections without tracking
                        for result in results:
                            boxes = result.boxes
                            for box in boxes:
                                # Get box coordinates (scale back to display size)
                                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                                x1 = int(x1 * (800 / 416))
                                y1 = int(y1 * (450 / 416))
                                x2 = int(x2 * (800 / 416))
                                y2 = int(y2 * (450 / 416))
                                
                                # Get confidence and class
                                conf = float(box.conf[0])
                                cls = int(box.cls[0])
                                label = model.names[cls]
                                
                                # Log detections for debugging (every 60 frames to avoid spam)
                                if frame_count % 60 == 0:
                                    print(f"[CAMERA {camera_id}] Detection: {label} (conf: {conf:.2f})", flush=True)
                                
                                # Color based on detection
                                color = (0, 255, 0) if label == 'Compliant' else (0, 0, 255)
                                
                                # Draw bounding box
                                cv2.rectangle(display_frame, (x1, y1), (x2, y2), color, 2)
                                
                                # Draw label
                                label_text = f"{label} {conf:.2f}"
                                (text_width, text_height), baseline = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                                
                                # Draw background rectangle for text (removed to keep label background transparent)
                                # rect_x1 = x1
                                # rect_y1 = y1 - text_height - baseline - 5
                                # rect_x2 = x1 + text_width + 5
                                # rect_y2 = y1 - baseline
                                # cv2.rectangle(display_frame, (rect_x1, rect_y1), (rect_x2, rect_y2), (0, 0, 0), -1)
                                
                                # Draw text
                                text_x = x1 + 2
                                text_y = y1 - baseline - 2
                                cv2.putText(display_frame, label_text, (text_x, text_y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                                
                                # === DETECTION CAPTURE LOGIC (BOTH COMPLIANT & NON-COMPLIANT) ===
                                # Normalize label (Model outputs: {0: 'Compliant', 1: 'Non_compliant'})
                                label_lower = label.lower().replace('-', '_').replace(' ', '_')
                                is_compliant = label_lower == 'compliant'
                                is_non_compliant = label_lower == 'non_compliant'
                                
                                # Debug logging for detection
                                if frame_count % 30 == 0:  # Log every 30 frames to reduce spam
                                    print(f"[CAMERA {camera_id}] Detected: '{label}' -> normalized: '{label_lower}' | Compliant: {is_compliant}, Non-compliant: {is_non_compliant} | Conf: {conf:.2f}", flush=True)
                                
                                if (is_compliant or is_non_compliant) and conf > 0.5:
                                    # Check cooldown (3 seconds between captures per status)
                                    detection_status = 'compliant' if is_compliant else 'non-compliant'
                                    
                                    from .models import ComplianceDetection
                                    last_detection = ComplianceDetection.objects.filter(
                                        camera_id=camera_id,
                                        status=detection_status
                                    ).order_by('-timestamp').first()
                                    
                                    should_capture = True
                                    if last_detection:
                                        time_since_last = timezone.now() - last_detection.timestamp
                                        if time_since_last < timedelta(seconds=3):
                                            should_capture = False
                                            print(f"[CAMERA {camera_id}] ⏳ Cooldown active for {detection_status} (waited {time_since_last.total_seconds():.1f}s / 3s)", flush=True)
                                    
                                    if should_capture:
                                        print(f"[CAMERA {camera_id}] 📸 Capturing {detection_status} detection (conf: {conf:.2f})", flush=True)
                                        try:
                                            snapshot = None
                                            
                                            # For NON-COMPLIANT: Create violation snapshot and upload to Cloudinary
                                            if is_non_compliant and conf > 0.6:
                                                # Encode frame as JPEG
                                                _, buffer = cv2.imencode('.jpg', display_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                                                
                                                try:
                                                    # Upload to Cloudinary
                                                    from io import BytesIO
                                                    import cloudinary.uploader
                                                    
                                                    img_bytes = BytesIO(buffer.tobytes())
                                                    upload_result = cloudinary.uploader.upload(
                                                        img_bytes,
                                                        folder="gatewatch/violations",
                                                        resource_type="image",
                                                        format="jpg",
                                                        transformation=[
                                                            {'quality': 'auto:good'},
                                                            {'fetch_format': 'auto'}
                                                        ]
                                                    )
                                                    
                                                    # Create violation snapshot with Cloudinary URL
                                                    snapshot = ViolationSnapshot.objects.create(
                                                        camera_id=camera_id,
                                                        confidence=float(conf),
                                                        bbox_x1=x1,
                                                        bbox_y1=y1,
                                                        bbox_x2=x2,
                                                        bbox_y2=y2,
                                                        image_url=upload_result['secure_url'],
                                                        cloudinary_public_id=upload_result['public_id']
                                                    )
                                                    
                                                    print(f"[CAMERA {camera_id}] 🚨 Violation captured! ID: {snapshot.id}, Conf: {conf:.2f}", flush=True)
                                                    print(f"[CLOUDINARY] Uploaded: {upload_result['secure_url']}", flush=True)
                                                    
                                                except Exception as e:
                                                    print(f"[CLOUDINARY] Upload error: {e}", flush=True)
                                                    # Fallback: Create snapshot without image if Cloudinary fails
                                                    snapshot = ViolationSnapshot.objects.create(
                                                        camera_id=camera_id,
                                                        confidence=float(conf),
                                                        bbox_x1=x1,
                                                        bbox_y1=y1,
                                                        bbox_x2=x2,
                                                        bbox_y2=y2
                                                    )
                                                    print(f"[CAMERA {camera_id}] ⚠️ Violation captured without image due to upload error", flush=True)
                                            
                                            # Create compliance detection record (for BOTH compliant & non-compliant)
                                            detection = ComplianceDetection.objects.create(
                                                camera_id=camera_id,
                                                status=detection_status,
                                                confidence=float(conf),
                                                violation_snapshot=snapshot if is_non_compliant else None
                                            )
                                            
                                            if is_compliant:
                                                print(f"[CAMERA {camera_id}] ✅ Compliant student detected! Conf: {conf:.2f}", flush=True)
                                            
                                        except Exception as e:
                                            print(f"[CAMERA {camera_id}] Error saving detection: {str(e)}", flush=True)
                        
                        # Add fallback mode overlay
                        mode_text = f"Mode: YOLOv8 Only (Fallback)"
                        cv2.putText(display_frame, mode_text, (10, display_frame.shape[0] - 50),
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 165, 0), 2)
                    
                    # Add status overlay
                    status_text = f"Camera: {camera.name} | Location: {camera.location}"
                    cv2.putText(display_frame, status_text, (10, 30),
                              cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                    
                    # Encode frame to JPEG with high quality for clear visuals
                    _, buffer = cv2.imencode('.jpg', display_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                    frame_bytes = buffer.tobytes()
                    
                    # Yield frame in MJPEG format
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                    
            except Exception as e:
                print(f"[CAMERA {camera_id}] Error: {str(e)}", flush=True)
                import traceback
                traceback.print_exc()
                
                # Return error frame
                error_frame = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(error_frame, f"Camera Error: {str(e)}", (50, 240),
                          cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                _, buffer = cv2.imencode('.jpg', error_frame)
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            
            finally:
                if cap:
                    cap.release()
                # Clean up from active streams
                active_streams.pop(camera_id, None)
                print(f"[CAMERA {camera_id}] Stream ended and cleaned up", flush=True)
        
        return StreamingHttpResponse(
            generate_frames_with_detection(),
            content_type='multipart/x-mixed-replace; boundary=frame'
        )


# ==================== VIOLATION MANAGEMENT VIEWS ====================

from rest_framework.decorators import api_view, permission_classes, authentication_classes
from .serializers import ViolationSnapshotSerializer

@api_view(['GET'])
@permission_classes([])
@authentication_classes([])
def unidentified_violations(request):
    """Get all violations that haven't been identified yet"""
    violations = ViolationSnapshot.objects.filter(identified=False).order_by('-timestamp')
    serializer = ViolationSnapshotSerializer(violations, many=True, context={'request': request})
    return Response({
        'count': violations.count(),
        'violations': serializer.data
    })

@api_view(['POST'])
@permission_classes([])
@authentication_classes([])
def identify_violation(request, violation_id):
    """Identify a student in a violation snapshot"""
    try:
        violation = ViolationSnapshot.objects.get(id=violation_id)
        
        # Update student information
        violation.student_id = request.data.get('student_id')
        violation.student_name = request.data.get('student_name')
        violation.department = request.data.get('department')
        violation.gender = request.data.get('gender')
        violation.notes = request.data.get('notes', violation.notes or '')
        violation.identified = True
        
        # Auto-escalate if student has 3+ violations
        violation_count = violation.get_student_violation_count()
        if violation.should_send_to_admin():
            violation.sent_to_admin = True
        
        violation.save()
        
        serializer = ViolationSnapshotSerializer(violation, context={'request': request})
        return Response({
            'message': 'Violation identified successfully',
            'violation': serializer.data,
            'sent_to_admin': violation.sent_to_admin,
            'violation_count': violation_count
        })
    except ViolationSnapshot.DoesNotExist:
        return Response({'error': 'Violation not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([])
@authentication_classes([])
def violations_for_review(request):
    """Get violations requiring admin review"""
    # Repeat offenders (students with 3+ identified violations)
    from django.db.models import Q, F
    from django.db.models.functions import Lower
    
    # Get all students with 3+ identified violations
    students_with_3plus = ViolationSnapshot.objects.filter(
        identified=True
    ).values('student_name').annotate(
        total_violations=Count('id')
    ).filter(total_violations__gte=3)
    
    # Get list of repeat offender names
    repeat_offender_names = [item['student_name'] for item in students_with_3plus]
    
    # For each repeat offender, get their summary data
    repeat_offenders_data = []
    for student_name in repeat_offender_names:
        # Get most recent violation for this student to get current dept/gender
        latest_violation = ViolationSnapshot.objects.filter(
            student_name=student_name,
            identified=True
        ).order_by('-timestamp').first()
        
        # Count total and unreviewed violations
        total_count = ViolationSnapshot.objects.filter(
            student_name=student_name,
            identified=True
        ).count()
        
        unreviewed_count = ViolationSnapshot.objects.filter(
            student_name=student_name,
            identified=True,
            reviewed=False
        ).count()
        
        repeat_offenders_data.append({
            'student_name': student_name,
            'department': latest_violation.department,
            'gender': latest_violation.gender,
            'violation_count': total_count,
            'unreviewed_count': unreviewed_count,
            'latest_violation': latest_violation.timestamp
        })
    
    # Sort by latest violation (most recent first)
    repeat_offenders_data.sort(key=lambda x: x['latest_violation'], reverse=True)
    
    # Pending identification
    pending_identification = ViolationSnapshot.objects.filter(
        identified=False
    ).order_by('-timestamp')[:10]
    
    # Pending review (all identified but not reviewed)
    pending_review = ViolationSnapshot.objects.filter(
        identified=True,
        reviewed=False
    ).order_by('-timestamp')
    
    # Recently reviewed (last 7 days)
    seven_days_ago = timezone.now() - timedelta(days=7)
    recently_reviewed = ViolationSnapshot.objects.filter(
        reviewed=True,
        timestamp__gte=seven_days_ago
    ).order_by('-timestamp')[:10]
    
    # Serialize the querysets
    pending_serializer = ViolationSnapshotSerializer(pending_identification, many=True, context={'request': request})
    pending_review_serializer = ViolationSnapshotSerializer(pending_review, many=True, context={'request': request})
    reviewed_serializer = ViolationSnapshotSerializer(recently_reviewed, many=True, context={'request': request})
    
    return Response({
        'repeat_offenders': list(repeat_offenders_data),
        'pending_identification': pending_serializer.data,
        'pending_review': pending_review_serializer.data,
        'recently_reviewed': reviewed_serializer.data
    })

@api_view(['POST'])
@permission_classes([])
@authentication_classes([])
def review_violation(request, violation_id):
    """Mark a violation as reviewed by admin"""
    try:
        violation = ViolationSnapshot.objects.get(id=violation_id)
        violation.reviewed = True
        if request.data.get('notes'):
            violation.notes = request.data.get('notes')
        violation.save()
        
        serializer = ViolationSnapshotSerializer(violation, context={'request': request})
        return Response({
            'message': 'Violation reviewed successfully',
            'violation': serializer.data
        })
    except ViolationSnapshot.DoesNotExist:
        return Response({'error': 'Violation not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([])
@authentication_classes([])
def student_violation_history(request):
    """Get all violations for a specific student"""
    student_name = request.query_params.get('student_name')
    
    if not student_name:
        return Response({'error': 'student_name parameter required'}, status=status.HTTP_400_BAD_REQUEST)
    
    violations = ViolationSnapshot.objects.filter(
        student_name__icontains=student_name,
        identified=True
    ).order_by('-timestamp')
    
    serializer = ViolationSnapshotSerializer(violations, many=True, context={'request': request})
    
    return Response({
        'student_name': student_name,
        'total_violations': violations.count(),
        'violations': serializer.data
    })

@api_view(['GET'])
@permission_classes([])
@authentication_classes([])
def violation_analytics(request):
    """Get violation statistics and trends"""
    # Date range (default: last 30 days)
    days = int(request.query_params.get('days', 30))
    start_date = timezone.now() - timedelta(days=days)
    
    violations = ViolationSnapshot.objects.filter(
        timestamp__gte=start_date,
        identified=True
    )
    
    # By department
    by_department = violations.values('department').annotate(
        count=Count('id')
    ).order_by('-count')
    
    # By gender
    by_gender = violations.values('gender').annotate(
        count=Count('id')
    )
    
    # By camera
    by_camera = violations.values('camera__name', 'camera__location').annotate(
        count=Count('id')
    ).order_by('-count')
    
    # Repeat offenders count
    repeat_offenders = violations.values('student_name').annotate(
        count=Count('id')
    ).filter(count__gte=3).count()
    
    # Daily trend
    daily_trend = violations.extra(
        select={'day': 'DATE(timestamp)'}
    ).values('day').annotate(count=Count('id')).order_by('day')
    
    return Response({
        'total_violations': violations.count(),
        'date_range_days': days,
        'by_department': list(by_department),
        'by_gender': list(by_gender),
        'by_camera': list(by_camera),
        'repeat_offenders_count': repeat_offenders,
        'daily_trend': list(daily_trend)
    })

