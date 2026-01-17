import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Camera, Monitor, RefreshCw, Users, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

interface ActiveCamera {
  id: number;
  name: string;
  location: string;
  stream_url: string;
  is_active: boolean;
  is_streaming: boolean;
  last_streamed_by: number | null;
  last_streamed_by_username: string | null;
  last_streamed_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function CameraMonitoring() {
  const [activeCameras, setActiveCameras] = useState<ActiveCamera[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchActiveCameras = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }
    
    try {
      const response = await axios.get('http://localhost:8000/api/camera/active/');
      setActiveCameras(response.data.cameras || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching active cameras:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActiveCameras();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchActiveCameras();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p>Loading camera monitoring...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Camera Monitoring</h1>
          <p className="text-muted-foreground">Monitor active camera streams from Security Personnel</p>
        </div>
        <Button 
          onClick={() => fetchActiveCameras(true)}
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Active Cameras Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Live Camera Feeds
          </CardTitle>
          <CardDescription>
            {activeCameras.length === 0 
              ? 'No cameras currently streaming - Waiting for Security Personnel'
              : `${activeCameras.length} camera${activeCameras.length !== 1 ? 's' : ''} actively streaming`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeCameras.length === 0 ? (
            <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
              <div className="text-center">
                <Camera className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">No Active Cameras</p>
                <p className="text-xs text-muted-foreground">
                  Security personnel's camera feeds will appear here when they start monitoring
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activeCameras.map((camera) => (
                <div key={camera.id} className="space-y-3">
                  {/* Camera Stream */}
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                    <img
                      className="w-full h-full object-cover"
                      src={`http://127.0.0.1:8000/api/camera/${camera.id}/stream/`}
                      alt={`${camera.name} live stream`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23333" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23666" font-size="12"%3ENo Signal%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>

                  {/* Camera Info */}
                  <div className="flex justify-center gap-2">
                    <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {camera.stream_url.startsWith('rtsp://') ? 'RTSP Stream' : 
                       camera.stream_url.startsWith('http://') ? 'HTTP Stream' : 
                       'Camera Stream'}
                    </div>
                  </div>

                  <div className="text-center">
                    <Badge className="bg-green-50 text-green-700 border-green-200">
                      ● Live
                    </Badge>
                  </div>

                  <div className="text-center">
                    <Badge variant="outline" className="text-xs">
                      {camera.stream_url.substring(0, 35)}...
                    </Badge>
                  </div>

                  {/* Additional Info */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
                    <span className="font-medium">{camera.name}</span>
                    <span>{camera.location || 'No location'}</span>
                  </div>

                  {camera.last_streamed_by_username && (
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <Users className="h-3 w-3" />
                      <span className="font-medium">Monitored by: {camera.last_streamed_by_username}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    Started: {formatTime(camera.last_streamed_at)} - {formatDate(camera.last_streamed_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
