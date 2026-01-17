from django.db import models
from django.contrib.auth.models import AbstractUser

# Custom User model to handle different roles (e.g., Guard, Student, Admin)
class User(AbstractUser):
    USER_ROLES = (
        ('admin', 'Administrator'),
        ('security', 'Security'),
    )
    email = models.EmailField(unique=True, blank=True)
    role = models.CharField(max_length=10, choices=USER_ROLES, default='security')

    # You can add other fields here if needed, like id_number
    # id_number = models.CharField(max_length=20, unique=True, null=True, blank=True)

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.username

class Student(models.Model):
    id_number = models.CharField(max_length=20, unique=True, primary_key=True)
    name = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.name} ({self.id_number})"

class DetectionLog(models.Model):
    STATUS_CHOICES = (
        ('compliant', 'Compliant'),
        ('non-compliant', 'Non-Compliant'),
    )
    # The new field to capture the type of non-compliance
    VIOLATION_CHOICES = (
        ('Missing ID', 'Missing ID'),
        ('Civilian clothes', 'Civilian clothes'),
        ('Missing uniform top', 'Missing uniform top'),
        ('Other', 'Other'),
    )

    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    violation_type = models.CharField(max_length=50, choices=VIOLATION_CHOICES, blank=True, null=True)
    location = models.CharField(max_length=100)
    student = models.ForeignKey(Student, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.student.id_number} - {self.status} at {self.location}"

class Camera(models.Model):
    """
    Model to store camera information for the surveillance system
    """
    name = models.CharField(max_length=100, help_text="Name for the camera")
    location = models.CharField(max_length=200, blank=True, null=True, help_text="Physical location of the camera")
    stream_url = models.CharField(max_length=500, help_text="RTSP URL or device index (e.g., rtsp://... or 0, 1, 2)")
    is_active = models.BooleanField(default=True, help_text="Whether the camera is currently active")
    is_streaming = models.BooleanField(default=False, help_text="Whether the camera is currently being streamed by security")
    last_streamed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='streamed_cameras', help_text="User who last started this stream")
    last_streamed_at = models.DateTimeField(null=True, blank=True, help_text="When the stream was last started")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Camera'
        verbose_name_plural = 'Cameras'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} - {self.location or 'No location'}"


class ViolationSnapshot(models.Model):
    """
    Model to store snapshots of non-compliant uniform detections
    """
    DEPARTMENT_CHOICES = (
        ('SAS', 'School of Arts and Sciences'),
        ('STCS', 'School of Technology and Computer Studies'),
        ('SOE', 'School of Engineering'),
        ('STE', 'School of Teacher Education'),
        ('SCJE', 'School of Criminal Justice Education'),
        ('SME', 'School of Management and Entrepreneurship'),
        ('SNHS', 'School of Nursing and Health Sciences'),
        ('LHS', 'Laboratory High School'),
    )
    
    GENDER_CHOICES = (
        ('M', 'Male'),
        ('F', 'Female'),
    )
    
    camera = models.ForeignKey(Camera, on_delete=models.SET_NULL, null=True, blank=True, related_name='violation_snapshots')
    image = models.ImageField(upload_to='violations/%Y/%m/%d/', help_text="Captured image of the violation (local fallback)", blank=True, null=True)
    image_url = models.URLField(max_length=500, blank=True, null=True, help_text="Cloudinary image URL")
    cloudinary_public_id = models.CharField(max_length=255, blank=True, null=True, help_text="Cloudinary public ID for deletion")
    timestamp = models.DateTimeField(auto_now_add=True)
    confidence = models.FloatField(help_text="Detection confidence score (0-1)")
    bbox_x1 = models.IntegerField(help_text="Bounding box top-left X coordinate", default=0)
    bbox_y1 = models.IntegerField(help_text="Bounding box top-left Y coordinate", default=0)
    bbox_x2 = models.IntegerField(help_text="Bounding box bottom-right X coordinate", default=0)
    bbox_y2 = models.IntegerField(help_text="Bounding box bottom-right Y coordinate", default=0)
    
    # Student identification fields (filled manually by security)
    student_id = models.CharField(max_length=20, blank=True, null=True, help_text="Student ID number")
    student_name = models.CharField(max_length=200, blank=True, null=True, help_text="Name of the student")
    department = models.CharField(max_length=10, choices=DEPARTMENT_CHOICES, blank=True, null=True, help_text="Student's department/school")
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True, null=True, help_text="Student's gender")
    
    # Workflow tracking
    identified = models.BooleanField(default=False, help_text="Whether student has been identified")
    reviewed = models.BooleanField(default=False, help_text="Whether admin has reviewed this violation")
    sent_to_admin = models.BooleanField(default=False, help_text="Whether this has been sent to admin")
    notes = models.TextField(blank=True, null=True, help_text="Additional notes about this violation")
    
    class Meta:
        verbose_name = 'Violation Snapshot'
        verbose_name_plural = 'Violation Snapshots'
        ordering = ['-timestamp']
    
    def __str__(self):
        if self.student_name:
            return f"{self.student_name} - Violation at {self.camera.name} - {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}"
        return f"Unidentified - Violation at {self.camera.name} - {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}"
    
    def get_student_violation_count(self):
        if not self.student_name:
            return 0
        return ViolationSnapshot.objects.filter(
            student_name=self.student_name,
            identified=True
        ).count()
    
    def should_send_to_admin(self):
        return self.get_student_violation_count() >= 3
    
    def delete(self, *args, **kwargs):
        if self.cloudinary_public_id:
            try:
                import cloudinary.uploader
                cloudinary.uploader.destroy(self.cloudinary_public_id)
                print(f"[CLOUDINARY] Deleted image: {self.cloudinary_public_id}")
            except Exception as e:
                print(f"[CLOUDINARY] Error deleting: {e}")
        super().delete(*args, **kwargs)


class Warning(models.Model):
    """
    Model to track warnings given to students before violations are recorded.
    After 2 warnings, the 3rd offense becomes a violation in the Review Center.
    """
    VIOLATION_TYPE_CHOICES = (
        ('improper_uniform', 'Improper Uniform'),
        ('missing_id', 'Missing ID'),
        ('civilian_clothes', 'Civilian Clothes'),
        ('missing_uniform_top', 'Missing Uniform Top'),
        ('other', 'Other'),
    )
    
    student_name = models.CharField(max_length=200, help_text="Name of the student")
    student_id = models.CharField(max_length=20, blank=True, null=True, help_text="Student ID number (optional)")
    department = models.CharField(max_length=10, blank=True, null=True, help_text="Student's department")
    gender = models.CharField(max_length=1, blank=True, null=True, help_text="Student's gender")
    violation_type = models.CharField(max_length=50, choices=VIOLATION_TYPE_CHOICES, default='improper_uniform', help_text="Type of uniform violation")
    
    detected_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='warnings_issued', help_text="Security personnel who issued the warning")
    camera = models.ForeignKey(Camera, on_delete=models.SET_NULL, null=True, blank=True, related_name='warnings')
    
    image_url = models.URLField(max_length=500, blank=True, null=True, help_text="Cloudinary image URL")
    cloudinary_public_id = models.CharField(max_length=255, blank=True, null=True, help_text="Cloudinary public ID")
    
    detected_at = models.DateTimeField(auto_now_add=True, help_text="When the warning was issued")
    notes = models.TextField(blank=True, null=True, help_text="Additional notes about the warning")
    
    # Expiry tracking
    is_expired = models.BooleanField(default=False, help_text="Whether this warning has expired")
    
    class Meta:
        verbose_name = 'Warning'
        verbose_name_plural = 'Warnings'
        ordering = ['-detected_at']
        indexes = [
            models.Index(fields=['student_name', 'detected_at']),
            models.Index(fields=['is_expired', 'detected_at']),
        ]
    
    def __str__(self):
        return f"Warning for {self.student_name} - {self.violation_type} - {self.detected_at.strftime('%Y-%m-%d %H:%M:%S')}"
    
    def get_student_warning_count(self):
        from django.utils import timezone
        from datetime import timedelta
        from django.conf import settings
        
        expiry_days = getattr(settings, 'WARNING_EXPIRY_DAYS', 30)
        cutoff_date = timezone.now() - timedelta(days=expiry_days)
        
        return Warning.objects.filter(
            student_name=self.student_name,
            is_expired=False,
            detected_at__gte=cutoff_date
        ).count()


class ComplianceDetection(models.Model):
    """
    Model to track ALL uniform detections (both compliant and non-compliant)
    Used for statistics and compliance rate calculations
    """
    STATUS_CHOICES = (
        ('compliant', 'Compliant'),
        ('non-compliant', 'Non-Compliant'),
    )
    
    camera = models.ForeignKey(Camera, on_delete=models.SET_NULL, null=True, blank=True, related_name='compliance_detections')
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, help_text="Compliance status")
    confidence = models.FloatField(help_text="Detection confidence score (0-1)")
    
    # Link to violation snapshot if this is a non-compliant detection
    violation_snapshot = models.OneToOneField(
        ViolationSnapshot, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='compliance_detection',
        help_text="Linked violation snapshot if status is non-compliant"
    )
    
    class Meta:
        verbose_name = 'Compliance Detection'
        verbose_name_plural = 'Compliance Detections'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['camera', 'timestamp']),
            models.Index(fields=['status', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.camera.name} - {self.status} - {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}"
