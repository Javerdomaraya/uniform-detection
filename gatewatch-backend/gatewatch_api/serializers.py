from rest_framework import serializers
from .models import User, Student, DetectionLog, Camera

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'role')
        read_only_fields = ('id',)

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = '__all__'

class DetectionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetectionLog
        fields = ('id', 'timestamp', 'status', 'location', 'student', 'violation_type')

class TodayStatsSerializer(serializers.Serializer):
    compliant = serializers.IntegerField()
    nonCompliant = serializers.IntegerField()
    totalDetections = serializers.IntegerField()

class RecentAlertSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    timestamp = serializers.DateTimeField(format="%H:%M:%S")
    type = serializers.CharField(source='violation_type')
    camera = serializers.CharField(source='location')

class CameraDetectionSerializer(serializers.Serializer):
    camera = serializers.CharField()
    last_detection = serializers.DateTimeField(format="%H:%M:%S")

class CameraSerializer(serializers.ModelSerializer):
    """
    Serializer for Camera model
    """
    class Meta:
        model = Camera
        fields = ('id', 'name', 'location', 'stream_url', 'is_active', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_name(self, value):
        """
        Validate that camera name is unique
        """
        if Camera.objects.filter(name=value).exists():
            raise serializers.ValidationError("A camera with this name already exists.")
        return value

    def validate_stream_url(self, value):
        """
        Validate stream URL format
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Stream URL is required.")

        # Basic validation for various stream formats
        value = value.strip()

        # Check for valid formats:
        # 1. RTSP URLs (IP cameras)
        # 2. HTTP URLs (Android IP Webcam apps)
        # 3. Device indices (USB cameras, Android devices)
        # 4. WebRTC URLs (modern browsers)
        # 5. Test URL for development
        valid_formats = [
            value.startswith('rtsp://'),  # RTSP streams
            value.startswith('http://'),  # HTTP streams (Android IP Webcam)
            value.startswith('https://'), # HTTPS streams
            value.startswith('webrtc://'), # WebRTC streams
            value.isdigit(),  # Device indices (0, 1, 2, etc.)
            value == 'test',  # Test URL for development
        ]

        if not any(valid_formats):
            raise serializers.ValidationError(
                "Stream URL must be a valid RTSP URL (rtsp://), HTTP URL (http://), WebRTC URL (webrtc://), or device index (number)."
            )

        return value