# Warning System Implementation

## Overview
The warning system has been successfully implemented to allow security personnel to give students **2 warnings** before a uniform violation is recorded in the Violation Review Center.

## How It Works

### Configuration (settings.py)
```python
WARNING_THRESHOLD = 2  # After 2 warnings, 3rd offense becomes a violation
WARNING_EXPIRY_DAYS = 30  # Warnings older than 30 days won't count
VIOLATION_TYPES = [
    'improper_uniform',
    'missing_id',
    'civilian_clothes',
    'missing_uniform_top',
    'other',
]
```

### Workflow

1. **First Detection (1st Warning)**
   - Security personnel identifies a student with a uniform violation
   - System creates a **Warning** record (not a violation)
   - Student receives warning 1/2
   - No record in Violation Review Center

2. **Second Detection (2nd Warning)**
   - Student is caught again within 30 days
   - System creates another **Warning** record
   - Student receives warning 2/2
   - Still no violation record

3. **Third Detection (Violation)**
   - Student is caught a 3rd time within 30 days
   - System creates a **Violation** record
   - Violation appears in Review Center
   - All previous warnings are considered when counting violations

### Warning Expiry
- Warnings older than 30 days automatically expire
- Expired warnings don't count toward the violation threshold
- Students get a "fresh start" after the expiry period
- This encourages long-term compliance

## Database Models

### Warning Model
```python
class Warning(models.Model):
    student_name = CharField  # Student's name
    student_id = CharField  # Student ID (optional)
    department = CharField  # Department/school
    gender = CharField  # Gender
    violation_type = CharField  # Type of violation
    detected_by = ForeignKey(User)  # Security personnel
    camera = ForeignKey(Camera)  # Camera that detected
    image_url = URLField  # Cloudinary image URL
    detected_at = DateTimeField  # When warning was issued
    notes = TextField  # Additional notes
    is_expired = BooleanField  # Whether warning expired
```

## API Endpoints

### 1. Identify Student (Modified)
**Endpoint:** `POST /api/violations/{id}/identify_student/`

**Behavior:**
- Checks student's warning count
- If < 2 warnings: Creates Warning, deletes snapshot
- If >= 2 warnings: Creates Violation in Review Center

**Request:**
```json
{
  "student_name": "John Doe",
  "student_id": "2021-00123",
  "department": "STCS",
  "gender": "M",
  "violation_type": "missing_id",
  "notes": "Additional notes"
}
```

**Response (Warning):**
```json
{
  "type": "warning",
  "warning_number": 1,
  "threshold": 2,
  "message": "Warning 1/2 issued to John Doe. 1 more warning(s) before violation.",
  "data": { /* warning details */ }
}
```

**Response (Violation):**
```json
{
  "type": "violation",
  "message": "Violation recorded for John Doe after 2 warnings.",
  "data": {
    "violation_count": 1,
    "warning_count": 2,
    /* violation details */
  }
}
```

### 2. List All Warnings
**Endpoint:** `GET /api/warnings/`

**Query Parameters:**
- `student_name` - Filter by student name
- `camera` - Filter by camera ID
- `is_expired` - Filter by expired status (true/false)
- `violation_type` - Filter by violation type
- `active_only=true` - Get only active warnings

### 3. Get Active Warnings
**Endpoint:** `GET /api/warnings/active_warnings/`

Returns all non-expired warnings within the expiry period.

**Response:**
```json
{
  "count": 15,
  "expiry_days": 30,
  "cutoff_date": "2025-12-19T10:30:00Z",
  "warnings": [ /* array of warnings */ ]
}
```

### 4. Get Student Warnings
**Endpoint:** `GET /api/warnings/student_warnings/?student_name=John%20Doe`

Get all warnings for a specific student.

**Response:**
```json
{
  "student_name": "John Doe",
  "active_warning_count": 2,
  "warning_threshold": 2,
  "warnings_remaining_before_violation": 0,
  "will_be_violation": true,
  "active_warnings": [ /* active warnings */ ],
  "all_warnings": [ /* all warnings including expired */ ]
}
```

### 5. Get Students at Risk
**Endpoint:** `GET /api/warnings/students_at_risk/`

Get students who have reached the warning threshold (next offense will be a violation).

**Response:**
```json
{
  "threshold": 2,
  "message": "Students with 2+ warnings (next offense will be a violation)",
  "students": [
    {
      "student_name": "John Doe",
      "department": "STCS",
      "gender": "M",
      "warning_count": 2
    }
  ]
}
```

### 6. Expire Old Warnings
**Endpoint:** `POST /api/warnings/expire_old_warnings/`

Manually expire warnings older than the configured expiry period.

**Response:**
```json
{
  "message": "Expired 5 old warnings",
  "expired_count": 5,
  "expiry_days": 30,
  "cutoff_date": "2025-12-19T10:30:00Z"
}
```

## Frontend Integration

### Security Dashboard Changes Needed

1. **Pending Identification Screen:**
   - Add `violation_type` dropdown when identifying student
   - Show warning count badge for students with active warnings
   - Display different message for warnings vs violations

2. **New "Warnings" Tab:**
   - List all active warnings
   - Show students at risk (2 warnings)
   - Display warning history per student
   - Option to manually expire old warnings

3. **Student Profile:**
   - Show warning count alongside violation count
   - Display warning history
   - Show "Next offense will be violation" alert if at threshold

### Example UI Flow

```
┌─────────────────────────────────────┐
│  Identify Student                   │
├─────────────────────────────────────┤
│  Name: [John Doe          ]         │
│  ID:   [2021-00123        ]         │
│  Dept: [STCS             ▼]         │
│  Type: [Missing ID       ▼]         │
│                                     │
│  ⚠️ Student has 1 warning          │
│  Next offense will be violation!    │
│                                     │
│  [Cancel]  [Submit Identification]  │
└─────────────────────────────────────┘
```

## Benefits

1. **Fair Policy:** Students get chances before formal violations
2. **Fresh Start:** Old warnings expire, encouraging improvement
3. **Transparency:** Students know their warning status
4. **Accountability:** All warnings are tracked and logged
5. **Flexibility:** Configurable thresholds and expiry periods

## Testing

### Test Scenario 1: First-time Offender
1. Identify student with violation
2. ✅ Should create Warning (not Violation)
3. ✅ Student should have 1 warning

### Test Scenario 2: Second Offense
1. Identify same student again
2. ✅ Should create second Warning
3. ✅ Student should have 2 warnings

### Test Scenario 3: Third Offense
1. Identify same student third time
2. ✅ Should create Violation in Review Center
3. ✅ Violation should note "after 2 warnings"

### Test Scenario 4: Warning Expiry
1. Set WARNING_EXPIRY_DAYS to 1 day
2. Create warning for student
3. Wait 2 days
4. Identify student again
5. ✅ Should create new Warning (old expired)

## Migration

The migration `0014_warning.py` has been created and applied successfully.

```bash
python manage.py makemigrations  # Already done
python manage.py migrate         # Already done
```

## Next Steps

1. **Frontend Integration:**
   - Update identification modal to include violation type
   - Create warnings dashboard
   - Add warning badges/alerts

2. **Notifications:**
   - Email students after 2nd warning
   - Alert admins when violations are created
   - SMS notifications (optional)

3. **Reports:**
   - Weekly warning summary
   - Student warning trends
   - Compliance improvement tracking

4. **Automation:**
   - Scheduled task to auto-expire old warnings
   - Daily summary for security personnel
   - Monthly compliance reports
