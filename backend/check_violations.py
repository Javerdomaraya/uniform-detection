import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gatewatch_backend.settings')
django.setup()

from gatewatch_api.models import ViolationSnapshot
from django.db.models import Count

# Check students with violations
result = ViolationSnapshot.objects.filter(identified=True).values('student_name').annotate(count=Count('id'))

print('\n=== Students with Violations ===')
for r in result:
    print(f"{r['student_name']}: {r['count']} violation(s)")

print(f'\n=== Students with 3+ violations ===')
repeat_offenders = [r for r in result if r['count'] >= 3]
if repeat_offenders:
    for r in repeat_offenders:
        print(f"{r['student_name']}: {r['count']} violations")
else:
    print('No students have 3 or more violations yet.')

print('\n=== Violation Status Breakdown ===')
total = ViolationSnapshot.objects.count()
identified = ViolationSnapshot.objects.filter(identified=True).count()
reviewed = ViolationSnapshot.objects.filter(reviewed=True).count()
sent_to_admin = ViolationSnapshot.objects.filter(sent_to_admin=True).count()

print(f'Total violations: {total}')
print(f'Identified: {identified}')
print(f'Reviewed: {reviewed}')
print(f'Sent to admin: {sent_to_admin}')
