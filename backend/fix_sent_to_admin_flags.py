import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gatewatch_backend.settings')
django.setup()

from gatewatch_api.models import ViolationSnapshot
from django.db.models import Count

print('\n=== Fixing sent_to_admin Flags ===\n')

# Find students with 3+ identified violations
students_with_3plus = ViolationSnapshot.objects.filter(
    identified=True
).values('student_name').annotate(
    count=Count('id')
).filter(count__gte=3)

if not students_with_3plus:
    print('No students with 3+ violations found.')
else:
    for student_data in students_with_3plus:
        student_name = student_data['student_name']
        count = student_data['count']
        
        print(f"Flagging all violations for: {student_name} ({count} violations)")
        
        # Update ALL identified violations for this student
        updated = ViolationSnapshot.objects.filter(
            student_name=student_name,
            identified=True
        ).update(sent_to_admin=True)
        
        print(f"  ✓ Updated {updated} violation(s)\n")

print('=== Summary ===')
total_flagged = ViolationSnapshot.objects.filter(sent_to_admin=True).count()
print(f'Total violations flagged as sent_to_admin: {total_flagged}')
