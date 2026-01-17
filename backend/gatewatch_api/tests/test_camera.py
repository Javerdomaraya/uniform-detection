from django.test import TestCase
from gatewatch_api.models import Camera


class CameraModelTests(TestCase):
    def test_create_duplicate_camera_names_allowed(self):
        # Create two cameras with the same name, should be allowed
        name = "Main Gate Camera"
        Camera.objects.create(name=name, stream_url='rtsp://example.com/stream1')
        Camera.objects.create(name=name, stream_url='rtsp://example.com/stream2')

        cameras = Camera.objects.filter(name=name)
        self.assertEqual(cameras.count(), 2)
