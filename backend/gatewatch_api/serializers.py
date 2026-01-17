from rest_framework import serializers
from .models import User, Student, DetectionLog, Camera, ViolationSnapshot, ComplianceDetection, Warning

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
    complianceRate = serializers.FloatField()
    totalTrend = serializers.FloatField()
    compliantTrend = serializers.FloatField()
    nonCompliantTrend = serializers.FloatField()
    timeRange = serializers.CharField()
    startTime = serializers.CharField()
    endTime = serializers.CharField()

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
    last_streamed_by_username = serializers.SerializerMethodField()
    
    class Meta:
        model = Camera
        fields = ('id', 'name', 'location', 'stream_url', 'is_active', 'is_streaming', 'last_streamed_by', 'last_streamed_by_username', 'last_streamed_at', 'created_at', 'updated_at')
        read_only_fields = ('id', 'is_streaming', 'last_streamed_by', 'last_streamed_at', 'created_at', 'updated_at')
    
    def get_last_streamed_by_username(self, obj):
        if obj.last_streamed_by:
            return obj.last_streamed_by.username
        return None

    def validate_name(self, value):
        """
        Validate that camera name is unique
        """
        # Get the instance being updated (if any)
        instance = self.instance
        
        # Check if another camera with this name exists (excluding current instance)
        queryset = Camera.objects.filter(name=value)
        if instance:
            queryset = queryset.exclude(pk=instance.pk)
        
        # Existing unique check removed to allow duplicate camera names
        # if queryset.exists():
        #     raise serializers.ValidationError("A camera with this name already exists.")
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

class ViolationSnapshotSerializer(serializers.ModelSerializer):
    camera_name = serializers.CharField(source='camera.name', read_only=True)
    camera_location = serializers.CharField(source='camera.location', read_only=True)
    image_url = serializers.SerializerMethodField()
    violation_count = serializers.SerializerMethodField()
    should_notify_admin = serializers.SerializerMethodField()
    department_display = serializers.CharField(source='get_department_display', read_only=True)
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)
    
    class Meta:
        model = ViolationSnapshot
        fields = (
            'id', 'camera', 'camera_name', 'camera_location', 'image', 'image_url', 'cloudinary_public_id',
            'timestamp', 'confidence', 'bbox_x1', 'bbox_y1', 'bbox_x2', 'bbox_y2',
            'student_id', 'student_name', 'department', 'department_display', 'gender', 'gender_display',
            'identified', 'reviewed', 'sent_to_admin', 'notes',
            'violation_count', 'should_notify_admin'
        )
        read_only_fields = ('id', 'timestamp', 'camera_name', 'camera_location', 'image_url', 'cloudinary_public_id',
                           'violation_count', 'should_notify_admin', 'department_display', 'gender_display')
    
    def get_image_url(self, obj):
        # Prioritize Cloudinary URL if available
        if obj.image_url:
            return obj.image_url
        
        # Fallback to local image
        request = self.context.get('request')
        if obj.image and hasattr(obj.image, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
    
    def get_violation_count(self, obj):
        return obj.get_student_violation_count()
    
    def get_should_notify_admin(self, obj):
        """Check if student has 3+ violations"""
        return obj.should_send_to_admin()

class ComplianceDetectionSerializer(serializers.ModelSerializer):
    camera_name = serializers.CharField(source='camera.name', read_only=True)
    camera_location = serializers.CharField(source='camera.location', read_only=True)
    
    class Meta:
        model = ComplianceDetection
        fields = (
            'id', 'camera', 'camera_name', 'camera_location',
            'timestamp', 'status', 'confidence', 'violation_snapshot'
        )
        read_only_fields = ('id', 'timestamp', 'camera_name', 'camera_location')


class WarningSerializer(serializers.ModelSerializer):
    """
    Serializer for Warning model
    """
    camera_name = serializers.CharField(source='camera.name', read_only=True)
    camera_location = serializers.CharField(source='camera.location', read_only=True)
    detected_by_username = serializers.CharField(source='detected_by.username', read_only=True)
    violation_type_display = serializers.CharField(source='get_violation_type_display', read_only=True)
    warning_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Warning
        fields = (
            'id', 'student_name', 'student_id', 'department', 'gender',
            'violation_type', 'violation_type_display',
            'detected_by', 'detected_by_username',
            'camera', 'camera_name', 'camera_location',
            'image_url', 'cloudinary_public_id',
            'detected_at', 'notes', 'is_expired',
            'warning_count'
        )
        read_only_fields = ('id', 'detected_at', 'camera_name', 'camera_location', 
                           'detected_by_username', 'violation_type_display', 'warning_count')
    
    def get_warning_count(self, obj):
        """Get total active warnings for this student"""
        return obj.get_student_warning_count()
