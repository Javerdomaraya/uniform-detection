from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Q
from django.http import HttpResponse
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from .models import ViolationSnapshot, Warning
from .serializers import ViolationSnapshotSerializer, WarningSerializer
import os
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from io import BytesIO

class ViolationSnapshotViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing violation snapshots
    """
    queryset = ViolationSnapshot.objects.all()
    serializer_class = ViolationSnapshotSerializer
    permission_classes = []  # Temporarily allow unauthenticated access for testing
    authentication_classes = []  # Disable authentication for testing
    
    def get_queryset(self):
        """Filter by camera, identified, reviewed status, or student name"""
        queryset = ViolationSnapshot.objects.all().order_by('-timestamp')
        
        # Filter by camera
        camera_id = self.request.query_params.get('camera', None)
        if camera_id:
            queryset = queryset.filter(camera_id=camera_id)
        
        # Filter by identified status (for pending identification)
        identified = self.request.query_params.get('identified', None)
        if identified is not None:
            queryset = queryset.filter(identified=identified.lower() == 'true')
        
        # Filter by reviewed status
        reviewed = self.request.query_params.get('reviewed', None)
        if reviewed is not None:
            queryset = queryset.filter(reviewed=reviewed.lower() == 'true')
        
        # Filter by sent_to_admin status
        sent_to_admin = self.request.query_params.get('sent_to_admin', None)
        if sent_to_admin is not None:
            queryset = queryset.filter(sent_to_admin=sent_to_admin.lower() == 'true')
        
        # Filter by student name (search)
        student_name = self.request.query_params.get('student_name', None)
        if student_name:
            queryset = queryset.filter(student_name__icontains=student_name)
        
        # Filter by department
        department = self.request.query_params.get('department', None)
        if department:
            queryset = queryset.filter(department=department)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def pending_identification(self, request):
        """Get all violations that need student identification"""
        snapshots = ViolationSnapshot.objects.filter(identified=False).order_by('-timestamp')
        serializer = self.get_serializer(snapshots, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def students_with_multiple_violations(self, request):
        """Get students with 2 or more violations (approaching the 3-violation threshold)"""
        # Get all identified violations grouped by student
        violations = ViolationSnapshot.objects.filter(
            identified=True,
            student_name__isnull=False
        ).values('student_name', 'department', 'gender').annotate(
            violation_count=Count('id')
        ).filter(violation_count__gte=2).order_by('-violation_count')
        
        return Response(violations)
    
    @action(detail=True, methods=['post'])
    def identify_student(self, request, pk=None):
        """
        Identify the student in the violation snapshot.
        Implements warning system: First 2 offenses are warnings, 3rd becomes a violation.
        Required fields: student_name, department, gender, violation_type
        """
        snapshot = self.get_object()
        
        # Validate required fields
        student_name = request.data.get('student_name')
        department = request.data.get('department')
        gender = request.data.get('gender')
        violation_type = request.data.get('violation_type', 'improper_uniform')
        
        if not all([student_name, department, gender]):
            return Response(
                {'error': 'student_name, department, and gender are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get settings
        warning_threshold = getattr(settings, 'WARNING_THRESHOLD', 2)
        warning_expiry_days = getattr(settings, 'WARNING_EXPIRY_DAYS', 30)
        
        # Count active warnings for this student (non-expired warnings within the expiry period)
        cutoff_date = timezone.now() - timedelta(days=warning_expiry_days)
        active_warnings = Warning.objects.filter(
            student_name=student_name,
            is_expired=False,
            detected_at__gte=cutoff_date
        ).count()
        
        # Determine if this should be a warning or a violation
        if active_warnings < warning_threshold:
            # Issue a warning
            warning = Warning.objects.create(
                student_name=student_name,
                student_id=request.data.get('student_id'),
                department=department,
                gender=gender,
                violation_type=violation_type,
                detected_by=request.user if request.user.is_authenticated else None,
                camera=snapshot.camera,
                image_url=snapshot.image_url,
                cloudinary_public_id=snapshot.cloudinary_public_id,
                notes=request.data.get('notes', f'Warning {active_warnings + 1} of {warning_threshold}')
            )
            
            # Delete the violation snapshot since it's now a warning
            snapshot.delete()
            
            serializer = WarningSerializer(warning)
            return Response({
                'type': 'warning',
                'warning_number': active_warnings + 1,
                'threshold': warning_threshold,
                'message': f'Warning {active_warnings + 1}/{warning_threshold} issued to {student_name}. {warning_threshold - active_warnings - 1} more warning(s) before violation.',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        else:
            # Record as violation (3rd+ offense)
            snapshot.student_name = student_name
            snapshot.student_id = request.data.get('student_id')
            snapshot.department = department
            snapshot.gender = gender
            snapshot.identified = True
            snapshot.notes = request.data.get('notes', f'Violation after {active_warnings} warnings')
            snapshot.save()
            
            # Count total violations for this student
            violation_count = snapshot.get_student_violation_count()
            should_notify = snapshot.should_send_to_admin()
            
            if should_notify:
                # Auto-flag ALL violations for this student as sent_to_admin
                ViolationSnapshot.objects.filter(
                    student_name=student_name,
                    identified=True
                ).update(sent_to_admin=True)
                
                snapshot.refresh_from_db()
            
            serializer = self.get_serializer(snapshot)
            response_data = serializer.data
            response_data['violation_count'] = violation_count
            response_data['should_notify_admin'] = should_notify
            response_data['warning_count'] = active_warnings
            
            message = f'Violation recorded for {student_name} after {active_warnings} warnings.'
            if should_notify:
                message += f' Student now has {violation_count} violations. Flagged for Administrator review.'
            
            return Response({
                'type': 'violation',
                'message': message,
                'data': response_data
            }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def mark_reviewed(self, request, pk=None):
        """Mark a violation as reviewed"""
        snapshot = self.get_object()
        snapshot.reviewed = True
        snapshot.notes = request.data.get('notes', snapshot.notes)
        snapshot.save()
        
        serializer = self.get_serializer(snapshot)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def send_to_admin(self, request, pk=None):
        """
        Send student to Administrator office (only if they have 3+ violations)
        This marks ALL violations for this student as sent to admin
        """
        snapshot = self.get_object()
        
        # Check if student is identified
        if not snapshot.identified or not snapshot.student_name:
            return Response(
                {'error': 'Student must be identified before sending to admin'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if student has 3+ violations
        violation_count = snapshot.get_student_violation_count()
        if violation_count < 3:
            return Response(
                {
                    'error': f'Student only has {violation_count} violation(s). Need 3 violations to send to Administrator.',
                    'violation_count': violation_count
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mark ALL violations for this student as sent to admin
        student_violations = ViolationSnapshot.objects.filter(
            student_name=snapshot.student_name,
            identified=True
        )
        student_violations.update(sent_to_admin=True, reviewed=True)
        
        # Here you could add actual email/notification logic
        # For example:
        # send_admin_notification(snapshot.student_name, violation_count)
        
        return Response({
            'message': f'{snapshot.student_name} has been sent to Administrator office with {violation_count} violations',
            'student_name': snapshot.student_name,
            'department': snapshot.get_department_display(),
            'gender': snapshot.get_gender_display(),
            'violation_count': violation_count,
            'violations_sent': student_violations.count()
        })
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete a violation snapshot and its associated image file.
        This only deletes the violation record, NOT the camera.
        """
        instance = self.get_object()
        
        # Delete the image file from disk if it exists
        if instance.image:
            try:
                if os.path.isfile(instance.image.path):
                    os.remove(instance.image.path)
            except Exception as e:
                print(f"Error deleting image file: {e}")
        
        # Delete the database record
        self.perform_destroy(instance)
        
        return Response(
            {'message': 'Violation deleted successfully'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['get'])
    def student_violations(self, request):
        """Get all violations for a specific student"""
        student_name = request.query_params.get('student_name')
        if not student_name:
            return Response(
                {'error': 'student_name parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        violations = ViolationSnapshot.objects.filter(
            student_name__iexact=student_name,
            identified=True
        ).order_by('-timestamp')
        
        serializer = self.get_serializer(violations, many=True)
        return Response({
            'student_name': student_name,
            'total_violations': violations.count(),
            'violations': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def download_pdf_report(self, request):
        """Generate and download a PDF report of reviewed violations"""
        period = request.query_params.get('period', 'month')  # day, month, year
        
        # Calculate date range based on period
        now = datetime.now()
        if period == 'day':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            period_label = f"Daily Report - {start_date.strftime('%B %d, %Y')}"
        elif period == 'year':
            start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            period_label = f"Annual Report - {start_date.year}"
        else:  # month
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            period_label = f"Monthly Report - {start_date.strftime('%B %Y')}"
        
        # Get reviewed violations within the period
        violations = ViolationSnapshot.objects.filter(
            reviewed=True,
            identified=True,
            timestamp__gte=start_date
        ).order_by('-timestamp')
        
        if not violations.exists():
            return Response(
                {'error': f'No reviewed violations found for the selected {period} period'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create PDF in memory
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
        elements = []
        
        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#666666'),
            spaceAfter=20,
            alignment=TA_CENTER
        )
        
        # Header
        elements.append(Paragraph("GateWatch System", title_style))
        elements.append(Paragraph("Uniform Violation Report", title_style))
        elements.append(Paragraph(period_label, subtitle_style))
        elements.append(Paragraph(f"Generated: {now.strftime('%B %d, %Y at %I:%M %p')}", subtitle_style))
        elements.append(Spacer(1, 0.3*inch))
        
        # Summary statistics
        total_violations = violations.count()
        unique_students = violations.values('student_name').distinct().count()
        
        summary_data = [
            ['Total Violations:', str(total_violations)],
            ['Unique Students:', str(unique_students)],
        ]
        
        summary_table = Table(summary_data, colWidths=[2.5*inch, 1.5*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f0f0')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        
        elements.append(summary_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Violations table
        elements.append(Paragraph("Violation Details", styles['Heading2']))
        elements.append(Spacer(1, 0.1*inch))
        
        # Table headers
        table_data = [['Student ID', 'Name', 'Dept', 'Gender', 'Camera', 'Date & Time', 'Conf.']]
        
        # Add violation rows
        for violation in violations:
            table_data.append([
                violation.student_id or 'Unidentified',
                violation.student_name or 'Unidentified',
                violation.get_department_display() or 'N/A',
                'Male' if violation.gender == 'M' else 'Female' if violation.gender == 'F' else 'N/A',
                violation.camera.name if violation.camera else 'N/A',
                violation.timestamp.strftime('%m/%d/%y %I:%M %p'),
                f"{round(violation.confidence * 100)}%"
            ])
        
        # Create table with appropriate column widths
        col_widths = [0.9*inch, 1.2*inch, 0.8*inch, 0.7*inch, 1.2*inch, 1.3*inch, 0.6*inch]
        violations_table = Table(table_data, colWidths=col_widths, repeatRows=1)
        
        # Style the table
        violations_table.setStyle(TableStyle([
            # Header styling
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            
            # Body styling
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
        ]))
        
        elements.append(violations_table)
        
        # Footer
        elements.append(Spacer(1, 0.3*inch))
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.grey,
            alignment=TA_CENTER
        )
        elements.append(Paragraph("This report contains confidential student information.", footer_style))
        elements.append(Paragraph("GateWatch Uniform Detection System", footer_style))
        
        # Build PDF
        doc.build(elements)
        
        # Prepare response
        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        filename = f'violation_report_{period}_{now.strftime("%Y%m%d")}.pdf'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response


class WarningViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing warnings issued to students before violations
    """
    queryset = Warning.objects.all()
    serializer_class = WarningSerializer
    permission_classes = []  # Temporarily allow unauthenticated access for testing
    authentication_classes = []  # Disable authentication for testing
    
    def get_queryset(self):
        """Filter warnings by student, camera, or expired status"""
        queryset = Warning.objects.all().order_by('-detected_at')
        
        # Filter by student name
        student_name = self.request.query_params.get('student_name', None)
        if student_name:
            queryset = queryset.filter(student_name__icontains=student_name)
        
        # Filter by camera
        camera_id = self.request.query_params.get('camera', None)
        if camera_id:
            queryset = queryset.filter(camera_id=camera_id)
        
        # Filter by expired status
        is_expired = self.request.query_params.get('is_expired', None)
        if is_expired is not None:
            queryset = queryset.filter(is_expired=is_expired.lower() == 'true')
        
        # Filter by violation type
        violation_type = self.request.query_params.get('violation_type', None)
        if violation_type:
            queryset = queryset.filter(violation_type=violation_type)
        
        # Filter active warnings (non-expired within expiry period)
        active_only = self.request.query_params.get('active_only', None)
        if active_only and active_only.lower() == 'true':
            warning_expiry_days = getattr(settings, 'WARNING_EXPIRY_DAYS', 30)
            cutoff_date = timezone.now() - timedelta(days=warning_expiry_days)
            queryset = queryset.filter(is_expired=False, detected_at__gte=cutoff_date)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def active_warnings(self, request):
        """Get all active (non-expired) warnings within the expiry period"""
        warning_expiry_days = getattr(settings, 'WARNING_EXPIRY_DAYS', 30)
        cutoff_date = timezone.now() - timedelta(days=warning_expiry_days)
        
        warnings = Warning.objects.filter(
            is_expired=False,
            detected_at__gte=cutoff_date
        ).order_by('-detected_at')
        
        serializer = self.get_serializer(warnings, many=True)
        return Response({
            'count': warnings.count(),
            'expiry_days': warning_expiry_days,
            'cutoff_date': cutoff_date,
            'warnings': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def student_warnings(self, request):
        """Get warnings grouped by student, showing active warning counts"""
        student_name = request.query_params.get('student_name')
        
        if not student_name:
            return Response(
                {'error': 'student_name parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        warning_expiry_days = getattr(settings, 'WARNING_EXPIRY_DAYS', 30)
        warning_threshold = getattr(settings, 'WARNING_THRESHOLD', 2)
        cutoff_date = timezone.now() - timedelta(days=warning_expiry_days)
        
        # Get active warnings for this student
        active_warnings = Warning.objects.filter(
            student_name=student_name,
            is_expired=False,
            detected_at__gte=cutoff_date
        ).order_by('-detected_at')
        
        # Get all warnings (including expired) for history
        all_warnings = Warning.objects.filter(
            student_name=student_name
        ).order_by('-detected_at')
        
        active_count = active_warnings.count()
        warnings_remaining = max(0, warning_threshold - active_count)
        
        return Response({
            'student_name': student_name,
            'active_warning_count': active_count,
            'warning_threshold': warning_threshold,
            'warnings_remaining_before_violation': warnings_remaining,
            'will_be_violation': active_count >= warning_threshold,
            'active_warnings': WarningSerializer(active_warnings, many=True).data,
            'all_warnings': WarningSerializer(all_warnings, many=True).data
        })
    
    @action(detail=False, methods=['get'])
    def students_at_risk(self, request):
        """Get students who have reached warning threshold (next offense will be violation)"""
        warning_expiry_days = getattr(settings, 'WARNING_EXPIRY_DAYS', 30)
        warning_threshold = getattr(settings, 'WARNING_THRESHOLD', 2)
        cutoff_date = timezone.now() - timedelta(days=warning_expiry_days)
        
        # Get active warnings grouped by student
        from django.db.models import Count
        at_risk_students = Warning.objects.filter(
            is_expired=False,
            detected_at__gte=cutoff_date
        ).values('student_name', 'department', 'gender').annotate(
            warning_count=Count('id')
        ).filter(warning_count__gte=warning_threshold).order_by('-warning_count')
        
        return Response({
            'threshold': warning_threshold,
            'message': f'Students with {warning_threshold}+ warnings (next offense will be a violation)',
            'students': list(at_risk_students)
        })
    
    @action(detail=False, methods=['post'])
    def expire_old_warnings(self, request):
        """Manually expire warnings older than the configured expiry period"""
        warning_expiry_days = getattr(settings, 'WARNING_EXPIRY_DAYS', 30)
        cutoff_date = timezone.now() - timedelta(days=warning_expiry_days)
        
        # Find warnings that should be expired but aren't yet
        warnings_to_expire = Warning.objects.filter(
            is_expired=False,
            detected_at__lt=cutoff_date
        )
        
        expired_count = warnings_to_expire.count()
        warnings_to_expire.update(is_expired=True)
        
        return Response({
            'message': f'Expired {expired_count} old warnings',
            'expired_count': expired_count,
            'expiry_days': warning_expiry_days,
            'cutoff_date': cutoff_date
        })
