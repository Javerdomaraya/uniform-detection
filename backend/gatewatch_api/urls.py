from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    DashboardStatsView, RecentLogsView, SecurityStatsView, RecentAlertsView, 
    CameraDetectionsView, ComplianceLogListView, ComplianceDetectionListView, UserViewSet, GetUserProfileView, 
    CameraViewSet, CameraStreamWithDetection, CameraConnectionTestView, 
    StartCameraStreamView, StopCameraStreamView, ActiveCamerasView,
    unidentified_violations, identify_violation, violations_for_review,
    review_violation, student_violation_history, violation_analytics
)
from .violation_views import ViolationSnapshotViewSet, WarningViewSet
from .firebase_views import firebase_login, firebase_register, firebase_verify_token, firebase_reset_password

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'cameras', CameraViewSet, basename='camera')
router.register(r'violations', ViolationSnapshotViewSet, basename='violation')
router.register(r'warnings', WarningViewSet, basename='warning')

urlpatterns = [
    # JWT Authentication endpoints
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('user/profile/', GetUserProfileView.as_view(), name='user_profile'),
    
    # Firebase Authentication endpoints
    path('auth/firebase/login/', firebase_login, name='firebase_login'),
    path('auth/firebase/register/', firebase_register, name='firebase_register'),
    path('auth/firebase/verify/', firebase_verify_token, name='firebase_verify'),
    path('auth/firebase/reset-password/', firebase_reset_password, name='firebase_reset_password'),

    # Dashboard endpoints
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('dashboard/recent-logs/', RecentLogsView.as_view(), name='recent-logs'),
    path('dashboard/camera-detections/', CameraDetectionsView.as_view(), name='dashboard-camera-detections'),

    # Security endpoints
    path('security/stats/', SecurityStatsView.as_view(), name='security-stats'),
    path('security/alerts/', RecentAlertsView.as_view(), name='recent-alerts'),
    path('security/camera-detections/', CameraDetectionsView.as_view(), name='camera-detections'),

    # Other endpoints
    path('compliance-logs/', ComplianceLogListView.as_view(), name='compliance-logs'),
    path('compliance-detections/', ComplianceDetectionListView.as_view(), name='compliance-detections'),
    path('camera/<int:camera_id>/stream/', CameraStreamWithDetection.as_view(), name='camera-stream'),
    path('camera/<int:camera_id>/start-stream/', StartCameraStreamView.as_view(), name='camera-start-stream'),
    path('camera/<int:camera_id>/stop-stream/', StopCameraStreamView.as_view(), name='camera-stop-stream'),
    path('camera/active/', ActiveCamerasView.as_view(), name='active-cameras'),
    path('camera/test-connection/', CameraConnectionTestView.as_view(), name='camera-test'),
    
    # Violation Management endpoints
    path('violations/unidentified/', unidentified_violations, name='unidentified-violations'),
    path('violations/<int:violation_id>/identify/', identify_violation, name='identify-violation'),
    path('violations/review/', violations_for_review, name='violations-for-review'),
    path('violations/<int:violation_id>/review/', review_violation, name='review-violation'),
    path('violations/student-history/', student_violation_history, name='student-violation-history'),
    path('violations/analytics/', violation_analytics, name='violation-analytics'),
    
    path('management/', include(router.urls)),  # All user management endpoints will be here
]
