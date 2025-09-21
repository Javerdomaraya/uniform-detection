from django.db import models
from django.contrib.auth.models import AbstractUser

# Custom User model to handle different roles (e.g., Guard, Student, Admin)
class User(AbstractUser):
    USER_ROLES = (
        ('admin', 'Administrator'),
        ('security', 'Security'),
    )
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
    name = models.CharField(max_length=100, unique=True, help_text="Unique name for the camera")
    location = models.CharField(max_length=200, blank=True, null=True, help_text="Physical location of the camera")
    stream_url = models.CharField(max_length=500, help_text="RTSP URL or device index (e.g., rtsp://... or 0, 1, 2)")
    is_active = models.BooleanField(default=True, help_text="Whether the camera is currently active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Camera'
        verbose_name_plural = 'Cameras'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} - {self.location or 'No location'}"
