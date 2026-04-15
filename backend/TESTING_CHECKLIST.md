# DeepSort Testing Checklist

## Quick Start
1. Start Django server: `python manage.py runserver`
2. Open Security Dashboard: http://localhost:8080
3. Navigate to Camera Monitoring
4. Click "Start Stream" on a camera

---

## ✅ What to Verify

### Console Logs (Backend Terminal)
```
Expected Output:
[DEEPSORT] Initializing DeepSort tracker for Camera 1...
[DEEPSORT] Tracker initialized for Camera 1
[CAMERA 1] Stream started
[CAMERA 1] Track ID: 42, Compliant (conf: 0.87)
[CAMERA 1] ✅ Track ID 42: Compliant student detected! Conf: 0.87
```

**Check for:**
- ✅ DeepSort initialization message
- ✅ Track ID numbers appearing
- ✅ First detection of each track ID logs save message
- ✅ Subsequent detections of same track ID do NOT log save

### Video Overlay (Frontend)
```
Top: "Camera: Main Gate | Location: Building A"
Bottom: "Mode: YOLOv8 + DeepSort | Active Tracks: 3"
Bounding Box: "ID:42 Compliant 0.87"
```

**Check for:**
- ✅ Bottom shows "YOLOv8 + DeepSort" (cyan text)
- ✅ Bounding boxes show "ID:XX" prefix
- ✅ Active Tracks count updates
- ✅ Track IDs persist across frames

### Database Records
```python
# Django shell: python manage.py shell
from gatewatch_api.models import ComplianceDetection, ViolationSnapshot

# Check detections
detections = ComplianceDetection.objects.all().order_by('-timestamp')[:5]
for d in detections:
    print(f"{d.id}: {d.status} - {d.confidence}")

# Check violations
violations = ViolationSnapshot.objects.filter(identified=False)
print(f"Pending: {violations.count()}")
```

**Check for:**
- ✅ New ComplianceDetection records created
- ✅ New ViolationSnapshot records for non-compliant
- ✅ No duplicates for same person in short timeframe

---

## 🔍 Test Scenarios

### Scenario 1: Single Person - Compliant
**Setup:** Person in compliant uniform enters frame
**Expected:**
- Track ID assigned (e.g., 42)
- First detection: Logs "✅ Track ID 42: Compliant student detected"
- ComplianceDetection record created (status='compliant')
- Subsequent frames: Track ID 42 persists, NO new logs
- Result: 1 record total

### Scenario 2: Single Person - Non-compliant
**Setup:** Person in non-compliant uniform enters frame
**Expected:**
- Track ID assigned (e.g., 43)
- First detection: Logs "🚨 Track ID 43: Violation captured! ID: 8"
- ViolationSnapshot + ComplianceDetection created
- Subsequent frames: Track ID 43 persists, NO new logs
- Result: 1 violation record, appears in admin dashboard

### Scenario 3: Multiple People
**Setup:** 3 people in frame (2 compliant, 1 non-compliant)
**Expected:**
- Track IDs 44, 45, 46 assigned
- 3 separate records created (one per person)
- "Active Tracks: 3" shown on overlay
- Each track ID persists independently
- Result: 3 records total (not 3 per frame)

### Scenario 4: Person Leaves and Returns
**Setup:** Person with Track ID 47 leaves frame for 3+ seconds
**Expected:**
- Track 47 expires after 30 frames (~2 seconds)
- Person returns: Gets NEW track ID (e.g., 50)
- New detection logs "Track ID 50: ..."
- Result: 2 records (one per track ID) - EXPECTED BEHAVIOR

### Scenario 5: Fallback Mode
**Setup:** DeepSort fails to initialize (unlikely)
**Expected:**
- Console: "[DEEPSORT] Failed to initialize tracker"
- Overlay: "Mode: YOLOv8 Only (Fallback)" (orange text)
- Bounding boxes: "Compliant 0.87" (no ID)
- Cooldown-based detection (3 seconds)
- Result: System still works, just without tracking

---

## ⚠️ Known Behavior (Not Bugs)

### Person gets different ID when returning
**Why:** Track expires after 30 frames without detection
**Expected:** Yes, this is normal. Person leaving = detection event ends.
**Solution:** If you need persistent IDs across sessions, implement embedder-based re-identification.

### Track ID jumps (42 → 50 → 53)
**Why:** DeepSort assigns IDs sequentially, even if tracks expire
**Expected:** Yes, ID numbers will have gaps
**Impact:** None - ID uniqueness is what matters, not sequence

### Multiple records for same person (rare)
**Why:** Person appearance changed significantly (lighting, angle, distance)
**Expected:** Occasionally happens, embedder re-identifies as new person
**Solution:** Tune `n_init` parameter higher (more detections to confirm)

---

## 🐛 Actual Issues to Report

### Issue: No track IDs appearing
**Check:** Console for "[DEEPSORT] Initialized" message
**Fix:** Restart server, check package installation

### Issue: Duplicate violations every frame
**Check:** Console logs - should only log FIRST detection
**Fix:** Verify `_tracked_violations` dictionary working

### Issue: Video not loading
**Check:** Camera stream URL, backend running
**Fix:** Restart backend, check camera connection

---

## 📊 Performance Baseline

**Expected Performance:**
- FPS: 15-20 (similar to YOLOv8 only)
- CPU: +10-15% compared to before
- GPU: +15-20% (embedder overhead)
- Memory: +100-200MB per camera

**If performance is poor:**
- Increase frame skip (8 → 12)
- Reduce max_age (30 → 20)
- Check GPU memory: `nvidia-smi`

---

## ✅ Success Criteria

Implementation is successful if:
- ✅ Console shows DeepSort initialization
- ✅ Video overlay shows tracking mode
- ✅ Bounding boxes show track IDs
- ✅ Same person NOT creating 10+ violations
- ✅ Database has reasonable record count
- ✅ No syntax errors in backend
- ✅ Camera stream loads and displays

---

## 📝 Quick Commands

```bash
# Start backend
cd gatewatch-backend
python manage.py runserver

# Check database
python manage.py shell
>>> from gatewatch_api.models import *
>>> ComplianceDetection.objects.count()
>>> ViolationSnapshot.objects.count()

# Check errors
# Watch console for error messages

# Test API
curl http://localhost:8000/api/dashboard/stats/
curl http://localhost:8000/api/violations/review/
```

---

## 🎉 Done!

If all checks pass, the implementation is complete and working correctly!
