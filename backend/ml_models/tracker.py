import cv2
import threading
import time
from ultralytics import YOLO
from deep_sort_realtime.deepsort_tracker import DeepSort

# Load YOLOv8 model
model = YOLO("ml_models/best.pt")

# Initialize DeepSort tracker
tracker = DeepSort(max_age=30)


class ThreadedCamera:
    """
    Background thread to continuously read frames from camera/RTSP stream.
    Always provides the latest frame, discarding old ones to eliminate lag.
    """
    def __init__(self, source=0):
        self.source = source
        self.cap = cv2.VideoCapture(source)
        
        # Reduce buffer size to minimize lag
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        
        if not self.cap.isOpened():
            raise ValueError(f"Cannot open camera source: {source}")
        
        # Thread-safe frame storage
        self.frame = None
        self.ret = False
        self.lock = threading.Lock()
        
        # Thread control
        self.stopped = False
        self.thread = threading.Thread(target=self._reader, daemon=True)
        self.thread.start()
        
        # Wait for first frame
        while self.frame is None:
            time.sleep(0.01)
        
        print(f"[ThreadedCamera] Started reading from {source}")
    
    def _reader(self):
        """Background thread that continuously reads frames"""
        while not self.stopped:
            ret, frame = self.cap.read()
            
            # Update latest frame (thread-safe)
            with self.lock:
                self.ret = ret
                self.frame = frame
            
            if not ret:
                print("[ThreadedCamera] Failed to read frame, stopping...")
                self.stopped = True
                break
    
    def read(self):
        """Get the latest frame (non-blocking)"""
        with self.lock:
            return self.ret, self.frame.copy() if self.frame is not None else None
    
    def release(self):
        """Stop the thread and release camera"""
        self.stopped = True
        self.thread.join(timeout=2.0)
        self.cap.release()
        print("[ThreadedCamera] Released camera")
    
    def is_opened(self):
        """Check if camera is still active"""
        return not self.stopped and self.cap.isOpened()


def draw_tracks(frame, tracks, model_names):
    """
    Draw bounding boxes and labels for all tracks.
    Returns the frame with drawings.
    """
    for track in tracks:
        if not track.is_confirmed():
            continue
        
        x1, y1, x2, y2 = track.to_ltrb()
        track_id = track.track_id
        
        # Get detection class if available
        det_class = track.det_class if hasattr(track, 'det_class') and track.det_class is not None else None
        det_conf = track.det_conf if hasattr(track, 'det_conf') and track.det_conf is not None else 0.0
        
        # Determine color based on class
        if det_class is not None:
            label_name = model_names.get(det_class, "Unknown")
            color = (0, 255, 0) if label_name.lower() == 'compliant' else (0, 0, 255)
            text = f"ID {track_id} | {label_name} {det_conf:.2f}"
        else:
            color = (255, 255, 0)  # Yellow for unknown
            text = f"ID {track_id}"
        
        # Draw bounding box
        cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
        
        # Prepare text label
        (text_width, text_height), baseline = cv2.getTextSize(
            text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1
        )
        
        # Draw background rectangle for text (removed to keep label background transparent)
        # rect_x1 = int(x1)
        # rect_y1 = int(y1) - text_height - baseline - 5
        # rect_x2 = int(x1) + text_width + 5
        # rect_y2 = int(y1) - baseline
        # cv2.rectangle(frame, (rect_x1, rect_y1), (rect_x2, rect_y2), (0, 0, 0), -1)
        
        # Draw text
        text_x = int(x1) + 2
        text_y = int(y1) - baseline - 2
        cv2.putText(frame, text, (text_x, text_y), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    
    return frame


def run_camera(source=0, skip_frames=3):
    """
    Run camera with YOLO detection and DeepSort tracking.
    
    Args:
        source: Camera source (0 for webcam, RTSP URL for IP camera)
        skip_frames: Process every Nth frame (e.g., 3 = process 1 out of 3 frames)
    """
    # Initialize threaded camera
    try:
        cam = ThreadedCamera(source)
    except ValueError as e:
        print(f"Error: {e}")
        return
    
    # Performance tracking
    frame_count = 0
    process_count = 0
    fps_start_time = time.time()
    display_fps = 0
    process_fps = 0
    
    # Last known tracks (for smooth display on skipped frames)
    last_tracks = []
    
    print(f"[Tracker] Starting detection loop (processing every {skip_frames} frames)")
    print("[Tracker] Press 'q' to quit")
    
    try:
        while cam.is_opened():
            # Get latest frame (non-blocking, always fresh)
            ret, frame = cam.read()
            if not ret or frame is None:
                print("[Tracker] No frame received, stopping...")
                break
            
            frame_count += 1
            current_time = time.time()
            
            # Calculate FPS every second
            if current_time - fps_start_time >= 1.0:
                display_fps = frame_count / (current_time - fps_start_time)
                process_fps = process_count / (current_time - fps_start_time)
                frame_count = 0
                process_count = 0
                fps_start_time = current_time
            
            # Process detection only every Nth frame
            if frame_count % skip_frames == 0:
                process_count += 1
                
                # Run YOLO detection (verbose=False for performance)
                results = model.predict(frame, conf=0.5, verbose=False)
                
                # Prepare detections for DeepSort
                detections = []
                for r in results:
                    for box in r.boxes:
                        xyxy = box.xyxy[0].tolist()
                        conf = float(box.conf[0])
                        cls = int(box.cls[0])
                        
                        # Convert to [x, y, w, h] format
                        x1, y1, x2, y2 = xyxy
                        w = x2 - x1
                        h = y2 - y1
                        
                        detections.append(([x1, y1, w, h], conf, cls))
                
                # Update tracks with DeepSort
                last_tracks = tracker.update_tracks(detections, frame=frame)
            
            # Draw tracks (uses last known tracks if frame was skipped)
            display_frame = draw_tracks(frame.copy(), last_tracks, model.names)
            
            # Add performance overlay
            info_text = [
                f"Display FPS: {display_fps:.1f}",
                f"Detection FPS: {process_fps:.1f}",
                f"Active Tracks: {len([t for t in last_tracks if t.is_confirmed()])}",
                f"Skip Rate: 1/{skip_frames}"
            ]
            
            y_offset = 30
            for i, text in enumerate(info_text):
                cv2.putText(display_frame, text, (10, y_offset + i * 25),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
            
            # Display frame
            cv2.imshow("YOLOv8 + DeepSORT (Optimized)", display_frame)
            
            # Check for quit key
            if cv2.waitKey(1) & 0xFF == ord('q'):
                print("[Tracker] Quit requested")
                break
    
    except KeyboardInterrupt:
        print("[Tracker] Interrupted by user")
    
    except Exception as e:
        print(f"[Tracker] Error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Cleanup
        cam.release()
        cv2.destroyAllWindows()
        print("[Tracker] Cleanup complete")


if __name__ == "__main__":
    # Example usage:
    
    # For webcam (processes every 3rd frame = ~10 FPS detection, 30 FPS display)
    run_camera(source=0, skip_frames=3)
    
    # For RTSP camera (processes every 2nd frame = ~15 FPS detection)
    # run_camera(source="rtsp://admin:password@192.168.1.100:554/stream", skip_frames=2)
    
    # For Android IP Webcam
    # run_camera(source="http://192.168.1.101:8080/video", skip_frames=3)