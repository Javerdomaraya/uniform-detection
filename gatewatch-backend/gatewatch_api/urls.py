from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import DashboardStatsView, RecentLogsView, SecurityStatsView, RecentAlertsView, CameraDetectionsView, ComplianceLogListView, UserViewSet, GetUserProfileView, CameraViewSet, CameraStreamProxyView, CameraConnectionTestView

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'cameras', CameraViewSet, basename='camera')

urlpatterns = [
    # JWT Authentication endpoints
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('user/profile/', GetUserProfileView.as_view(), name='user_profile'),

    # Dashboard endpoints
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('dashboard/recent-logs/', RecentLogsView.as_view(), name='recent-logs'),

    # Security endpoints
    path('security/stats/', SecurityStatsView.as_view(), name='security-stats'),
    path('security/alerts/', RecentAlertsView.as_view(), name='recent-alerts'),
    path('security/camera-detections/', CameraDetectionsView.as_view(), name='camera-detections'),

    # Other endpoints
    path('compliance-logs/', ComplianceLogListView.as_view(), name='compliance-logs'),
    path('camera/<int:camera_id>/stream/', CameraStreamProxyView.as_view(), name='camera-stream'),
    path('camera/test-connection/', CameraConnectionTestView.as_view(), name='camera-test'),
    path('management/', include(router.urls)),  # All user management endpoints will be here
]