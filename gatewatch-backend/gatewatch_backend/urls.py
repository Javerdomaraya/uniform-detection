
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from gatewatch_api.views import GetUserProfileView, CameraStreamProxyView

urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT Authentication Endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # User Profile Endpoint
    path('api/user/profile/', GetUserProfileView.as_view(), name='user-profile'),

    # Include your other API endpoints
    path('api/', include('gatewatch_api.urls')),

    # Camera stream proxy (outside API namespace for direct access)
    path('camera/<int:camera_id>/stream/', CameraStreamProxyView.as_view(), name='camera-stream-proxy'),
]
