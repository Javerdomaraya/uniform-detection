from django.contrib import admin
from .models import User, Student, DetectionLog, Camera, ViolationSnapshot, ComplianceDetection

# Register your models here.

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'role', 'is_active')
    list_filter = ('role', 'is_active')
    search_fields = ('username', 'email')

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('id_number', 'name')
    search_fields = ('id_number', 'name')

@admin.register(DetectionLog)
class DetectionLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'student', 'status', 'location')
    list_filter = ('status', 'timestamp')
    search_fields = ('student__name', 'location')

@admin.register(Camera)
class CameraAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'is_active', 'is_streaming', 'last_streamed_at')
    list_filter = ('is_active', 'is_streaming')
    search_fields = ('name', 'location')

@admin.register(ViolationSnapshot)
class ViolationSnapshotAdmin(admin.ModelAdmin):
    list_display = ('id', 'camera', 'student_name', 'department', 'confidence', 'identified', 'reviewed', 'timestamp')
    list_filter = ('identified', 'reviewed', 'sent_to_admin', 'department', 'camera')
    search_fields = ('student_name', 'notes')
    readonly_fields = ('timestamp', 'image', 'confidence', 'bbox_x1', 'bbox_y1', 'bbox_x2', 'bbox_y2')

@admin.register(ComplianceDetection)
class ComplianceDetectionAdmin(admin.ModelAdmin):
    list_display = ('id', 'camera', 'status', 'confidence', 'timestamp')
    list_filter = ('status', 'camera', 'timestamp')
    search_fields = ('camera__name',)
    readonly_fields = ('timestamp',)
    ordering = ('-timestamp',)
