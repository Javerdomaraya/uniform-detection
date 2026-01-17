import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Switch } from '../components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Monitor,
  CheckCircle,
  XCircle,
  Bell,
  Volume2,
  VolumeX,
  Camera,
  Plus,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  RefreshCw,
  Settings,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Filter,
  ShieldAlert,
  Search,
  EllipsisVertical,
  WifiOff,
  MapPin,
  Server,
  Globe,
  Usb,
  Link,
  CircleCheck,
  Smartphone,
  HelpCircle,
  Play,
  Square
} from 'lucide-react';

interface Metric {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'yellow';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  details?: string;
}

interface MetricsGridProps {
  metrics: Metric[];
}

function MetricsGrid({ metrics }: MetricsGridProps) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    green: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    red: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    yellow: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {metrics.map((metric, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
            <div className={`p-2 rounded-lg ${colorClasses[metric.color]}`}>
              {metric.icon}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className={`text-3xl font-bold ${metric.color === 'green' ? 'text-green-600' : metric.color === 'red' ? 'text-red-600' : 'text-foreground'}`}>
                {metric.value}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{metric.description}</p>
                {metric.trend && metric.trendValue !== undefined && (
                  <div className="flex items-center gap-1">
                    {getTrendIcon(metric.trend)}
                    <span className="text-xs font-medium">{metric.trendValue}%</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Enhanced Alerts Component
interface AlertItem {
  id: number;
  type: string;
  camera: string;
  timestamp: string;
  severity?: 'High' | 'Medium' | 'Low';
  details?: string;
}

interface AlertsCardProps {
  alerts: AlertItem[];
}

function AlertsCard({ alerts }: AlertsCardProps) {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAlerts = alerts
    .filter((alert) => {
      const matchesFilter = filter === 'all' || alert.severity?.toLowerCase() === filter;
      const matchesSearch = searchQuery === '' ||
        alert.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.camera.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });

  const getSeverityColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400';
      case 'medium':
        return 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400';
      case 'low':
        return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400';
      default:
        return 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400';
    }
  };

  const getPriorityBadge = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return 'high Priority';
      case 'medium':
        return 'medium Priority';
      case 'low':
        return 'low Priority';
      default:
        return 'high Priority';
    }
  };

  const getAlertIcon = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return <XCircle className="h-4 w-4" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <XCircle className="h-4 w-4" />;
    }
  };

  const getAlertBg = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return 'bg-rose-50/50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30';
      case 'medium':
        return 'bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30';
      case 'low':
        return 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30';
      default:
        return 'bg-rose-50/50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30';
    }
  };

  const getPulseColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return 'bg-rose-500';
      case 'medium':
        return 'bg-amber-500';
      case 'low':
        return 'bg-emerald-500';
      default:
        return 'bg-rose-500';
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg sticky top-24">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-slate-500" aria-hidden="true" />
            Alert Feed
          </h3>
          <div className="relative">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="text-xs font-medium text-slate-500 hover:text-primary border-0 bg-transparent shadow-none p-0 h-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alerts</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Live non-compliance events</p>
        <div className="mt-4 relative">
          <label htmlFor="event-search" className="sr-only">Search events</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            id="event-search"
            name="eventSearch"
            type="text"
            placeholder="Search events..."
            className="w-full h-9 pl-9 pr-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No alerts match your criteria.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`relative p-3 rounded-lg border transition-all hover:shadow-md cursor-pointer group ${getAlertBg(alert.severity)}`}
            >
              <div className={`absolute top-3 right-3 h-2 w-2 rounded-full animate-pulse ${getPulseColor(alert.severity)}`}></div>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full mt-1 ${getSeverityColor(alert.severity)}`}>
                  {getAlertIcon(alert.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold truncate text-slate-900 dark:text-white">
                    {alert.type}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{alert.timestamp}</span>
                    <span>•</span>
                    <span>{alert.camera}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-white text-slate-700 border border-slate-200 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300">
                      {getPriorityBadge(alert.severity)}
                    </span>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600 dark:hover:text-white">
                      <EllipsisVertical className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 rounded-b-xl">
        <Button
          variant="outline"
          className="w-full h-9 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
          onClick={() => {/* Handle view history */}}
        >
          View Alert History
        </Button>
      </div>
    </div>
  );
}

export default function SecurityDashboard() {
  const navigate = useNavigate();
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isAlertExpanded, setIsAlertExpanded] = useState(false);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);


  const [timeRange, setTimeRange] = useState('24h');
  const [todayStats, setTodayStats] = useState({
    compliant: 0,
    nonCompliant: 0,
    totalDetections: 0,
    complianceRate: 0,
    totalTrend: 0,
    compliantTrend: 0,
    nonCompliantTrend: 0,
    timeRange: '24h',
    startTime: '',
    endTime: ''
  });

  const [recentAlerts, setRecentAlerts] = useState([]);
  const [repeatOffenders, setRepeatOffenders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Camera management state
  const [cameras, setCameras] = useState([]);
  const [showAddCameraDialog, setShowAddCameraDialog] = useState(false);
  const [showEditCameraDialog, setShowEditCameraDialog] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [newCamera, setNewCamera] = useState({
    name: '',
    location: '',
    stream_url: ''
  });
  const [editCamera, setEditCamera] = useState({
    name: '',
    location: '',
    stream_url: ''
  });
  const [isCreatingCamera, setIsCreatingCamera] = useState(false);
  const [isUpdatingCamera, setIsUpdatingCamera] = useState(false);
  const [camerasLoading, setCamerasLoading] = useState(false);
  const [cameraLoadingStates, setCameraLoadingStates] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch stats function (reusable)
  const fetchStats = async (range = timeRange) => {
    try {
      const statsResponse = await axios.get(`http://127.0.0.1:8000/api/security/stats/?range=${range}`);
      setTodayStats(statsResponse.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Auto-refresh stats every 5 minutes and when timeRange changes
  useEffect(() => {
    fetchStats(timeRange); // Initial fetch with current range
    const interval = setInterval(() => fetchStats(timeRange), 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [timeRange]);

  // Helper functions for header actions
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refetch all dashboard data
      const [statsResponse, alertsResponse, reviewResponse] = await Promise.all([
        axios.get(`http://127.0.0.1:8000/api/security/stats/?range=${timeRange}`),
        axios.get('http://127.0.0.1:8000/api/security/alerts/'),
        axios.get('http://127.0.0.1:8000/api/violations/review/')
      ]);

      setTodayStats(statsResponse.data);
      setRecentAlerts(alertsResponse.data);
      setRepeatOffenders(reviewResponse.data.repeat_offenders || []);

      // Refresh cameras
      await fetchCameras();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = () => {
    // Export alerts to CSV
    const csvContent = [
      ['Type', 'Camera', 'Timestamp'].join(','),
      ...recentAlerts.map(alert => 
        [alert.type || 'Violation', alert.camera, alert.timestamp].join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts_${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Fullscreen toggle function
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  // Camera management functions
  const fetchCameras = async () => {
    try {
      setCamerasLoading(true);
      const response = await axios.get('http://127.0.0.1:8000/api/management/cameras/', {
        // Temporarily remove auth for testing
        // headers: { Authorization: `Bearer ${token}` }
      });
      setCameras(response.data);

      // Initialize loading states for all cameras
      const loadingStates = {};
      response.data.forEach(camera => {
        loadingStates[camera.id] = true; // Start with loading = true
      });
      setCameraLoadingStates(loadingStates);
    } catch (error) {
      console.error('Error fetching cameras:', error);
      // Don't show alert for fetch errors, just log them
    } finally {
      setCamerasLoading(false);
    }
  };

  const createCamera = async () => {
    if (!newCamera.name || !newCamera.stream_url) {
      alert('Please fill in all required fields (Name and Stream URL)');
      return;
    }

    setIsCreatingCamera(true);
    try {
      // Prepare the data to send
      const cameraData = {
        name: newCamera.name.trim(),
        location: newCamera.location?.trim() || null,
        stream_url: newCamera.stream_url.trim(),
        is_active: true // Default to active when creating
      };

      const response = await axios.post('http://127.0.0.1:8000/api/management/cameras/', cameraData, {
        headers: {
          'Content-Type': 'application/json',
        }
        // Temporarily remove auth for testing
        // headers: { Authorization: `Bearer ${token}` }
      });

      // Reset form
      setNewCamera({
        name: '',
        location: '',
        stream_url: ''
      });
      setShowAddCameraDialog(false);

      // Refresh cameras list
      fetchCameras();

      alert('Camera registered successfully!');
    } catch (error) {
      console.error('Error creating camera:', error);
      
      // Extract detailed error messages
      let errorMessage = 'Failed to register camera. Please try again.';
      
      if (axios.isAxiosError(error) && error.response) {
        const data = error.response.data;
        console.error('Error details:', data);
        
        // Handle different error formats
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.name) {
          errorMessage = `Name: ${Array.isArray(data.name) ? data.name[0] : data.name}`;
        } else if (data.stream_url) {
          errorMessage = `Stream URL: ${Array.isArray(data.stream_url) ? data.stream_url[0] : data.stream_url}`;
        } else if (data.location) {
          errorMessage = `Location: ${Array.isArray(data.location) ? data.location[0] : data.location}`;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        }
      }
      
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsCreatingCamera(false);
    }
  };

  const deleteCamera = async (cameraId, cameraName) => {
    if (!confirm(`Are you sure you want to remove the camera "${cameraName}"?`)) {
      return;
    }

    try {
      await axios.delete(`http://127.0.0.1:8000/api/management/cameras/${cameraId}/`, {
        // Temporarily remove auth for testing
        // headers: { Authorization: `Bearer ${token}` }
      });

      // Refresh cameras list
      fetchCameras();

      alert('Camera removed successfully!');
    } catch (error) {
      console.error('Error deleting camera:', error);
      alert('Failed to remove camera. Please try again.');
    }
  };

  const openEditCameraDialog = (camera) => {
    setEditingCamera(camera);
    setEditCamera({
      name: camera.name,
      location: camera.location || '',
      stream_url: camera.stream_url
    });
    setShowEditCameraDialog(true);
  };

  const updateCamera = async () => {
    if (!editCamera.name || !editCamera.stream_url) {
      alert('Please fill in all required fields (Name and Stream URL)');
      return;
    }

    setIsUpdatingCamera(true);
    try {
      await axios.put(`http://127.0.0.1:8000/api/management/cameras/${editingCamera.id}/`, editCamera, {
        // Temporarily remove auth for testing
        // headers: { Authorization: `Bearer ${token}` }
      });

      // Reset form
      setEditCamera({
        name: '',
        location: '',
        stream_url: ''
      });
      setEditingCamera(null);
      setShowEditCameraDialog(false);

      // Refresh cameras list
      fetchCameras();

      alert('Camera updated successfully!');
    } catch (error) {
      console.error('Error updating camera:', error);
      const errorMessage = error.response?.data?.message ||
                          error.response?.data?.stream_url?.[0] ||
                          error.response?.data?.name?.[0] ||
                          error.response?.data?.detail ||
                          'Failed to update camera. Please try again.';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsUpdatingCamera(false);
    }
  };

  const toggleCameraStatus = async (cameraId, cameraName, currentStatus) => {
    const action = currentStatus ? 'stop' : 'start';
    if (!confirm(`Are you sure you want to ${action} the camera "${cameraName}"?`)) {
      return;
    }

    try {
      await axios.patch(
        `http://127.0.0.1:8000/api/management/cameras/${cameraId}/`,
        {
          is_active: !currentStatus
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
          // Temporarily remove auth for testing
          // headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Mark camera as streaming/not streaming for Admin monitoring
      if (!currentStatus) {
        // Starting camera - mark as streaming
        await axios.post(`http://127.0.0.1:8000/api/camera/${cameraId}/start-stream/`);
      } else {
        // Stopping camera - mark as not streaming
        await axios.post(`http://127.0.0.1:8000/api/camera/${cameraId}/stop-stream/`);
      }

      // Refresh cameras list
      fetchCameras();

      alert(`Camera ${action}ped successfully!`);
    } catch (error) {
      console.error('Error toggling camera status:', error);
      
      // Extract detailed error message
      let errorMessage = 'Failed to update camera status. Please try again.';
      
      if (axios.isAxiosError(error) && error.response) {
        const data = error.response.data;
        console.error('Error details:', data);
        
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.is_active) {
          errorMessage = `Status: ${Array.isArray(data.is_active) ? data.is_active[0] : data.is_active}`;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        }
      }
      
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleCameraLoad = (cameraId) => {
    console.log(`✅ Camera ${cameraId} loaded successfully`);
    setCameraLoadingStates(prev => ({
      ...prev,
      [cameraId]: false
    }));
  };

  const handleCameraError = (cameraId, error) => {
    console.error(`❌ Camera ${cameraId} error:`, error);
    setCameraLoadingStates(prev => ({
      ...prev,
      [cameraId]: false
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Temporarily remove auth and use absolute URLs for testing
        const [statsResponse, alertsResponse, reviewResponse] = await Promise.all([
          axios.get('http://127.0.0.1:8000/api/security/stats/', {
            // headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://127.0.0.1:8000/api/security/alerts/', {
            // headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://127.0.0.1:8000/api/violations/review/', {
            // headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setTodayStats(statsResponse.data);
        setRecentAlerts(alertsResponse.data);
        setRepeatOffenders(reviewResponse.data.repeat_offenders || []);

        // Fetch cameras
        await fetchCameras();
      } catch (error) {
        console.error('Error fetching security dashboard data:', error);
        // Set default values if API fails
        setTodayStats({
          compliant: 0,
          nonCompliant: 0,
          totalDetections: 0,
          complianceRate: 0,
          totalTrend: 0,
          compliantTrend: 0,
          nonCompliantTrend: 0,
          timeRange: '24h',
          startTime: '',
          endTime: ''
        });
        setRecentAlerts([]);
        setRepeatOffenders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 min-h-screen">
        <div className="text-center py-8">
          <p>Loading security dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Security Dashboard</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Real-time uniform compliance monitoring</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={recentAlerts.length === 0}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dashboard Settings</DialogTitle>
                  <DialogDescription>Adjust dashboard preferences</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      <span className="text-sm">Alerts</span>
                    </div>
                    <Switch id="alerts-enabled" checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                      <span className="text-sm">Sound</span>
                    </div>
                    <Switch id="sound-enabled" checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Camera Dialog */}
            <Dialog open={showEditCameraDialog} onOpenChange={setShowEditCameraDialog}>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Edit Camera Configuration
                  </DialogTitle>
                  <DialogDescription>
                    Update the configuration for this surveillance camera.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-camera-name" className="text-right">
                      Name *
                    </Label>
                    <Input
                      id="edit-camera-name"
                      name="edit-camera-name"
                      type="text"
                      value={editCamera.name}
                      onChange={(e) => setEditCamera({...editCamera, name: e.target.value})}
                      className="col-span-3"
                      placeholder="e.g., Main Gate Left"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-camera-location" className="text-right">
                      Location
                    </Label>
                    <Input
                      id="edit-camera-location"
                      name="edit-camera-location"
                      type="text"
                      value={editCamera.location}
                      onChange={(e) => setEditCamera({...editCamera, location: e.target.value})}
                      className="col-span-3"
                      placeholder="e.g., Main Gate Entrance"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="edit-stream-url" className="text-right pt-2">
                      Stream URL *
                    </Label>
                    <Textarea
                      id="edit-stream-url"
                      name="edit-stream-url"
                      value={editCamera.stream_url}
                      onChange={(e) => setEditCamera({...editCamera, stream_url: e.target.value})}
                      className="col-span-3"
                      placeholder="e.g., rtsp://192.168.1.20:554/stream, http://192.168.1.100:8080/video, or 0"
                      rows={3}
                      required
                    />
                  </div>
                  <div className="col-span-4">
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-1">Stream URL Examples:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Test Camera:</strong> <code className="bg-green-100 px-1 rounded text-green-800">test</code> (for development testing)</li>
                        <li>IP Camera: <code className="bg-muted px-1 rounded">rtsp://username:password@192.168.1.20:554/stream</code></li>
                        <li><strong>Android IP Webcam (with auth):</strong> <code className="bg-blue-100 px-1 rounded text-blue-800">http://username:password@192.168.137.81:8080/video</code></li>
                        <li>Android IP Webcam (no auth): <code className="bg-muted px-1 rounded">http://192.168.137.81:8080/video</code></li>
                        <li>USB Camera: <code className="bg-muted px-1 rounded">0</code>, <code className="bg-muted px-1 rounded">1</code>, <code className="bg-muted px-1 rounded">2</code></li>
                        <li>WebRTC: <code className="bg-muted px-1 rounded">webrtc://android-camera</code></li>
                      </ul>
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="font-medium text-blue-900 mb-1">📱 Android Camera Setup:</p>
                        <ol className="text-blue-800 text-sm space-y-1">
                          <li>1. Install "IP Webcam" app from Google Play Store</li>
                          <li>2. Open the app and start the server</li>
                          <li>3. Use the HTTP URL shown in the app (e.g., http://192.168.1.100:8080/video)</li>
                          <li>4. Make sure your Android device and computer are on the same WiFi network</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={updateCamera} disabled={isUpdatingCamera}>
                    {isUpdatingCamera ? 'Updating...' : 'Update Camera'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-6">

        {/* Alert Banner for Repeat Offenders */}
        {repeatOffenders.length > 0 && !isAlertDismissed && (
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/10 dark:to-orange-800/10 border border-orange-200 dark:border-orange-800/30 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="p-5 pl-7 flex items-start gap-5">
              <div className="flex-shrink-0">
                <div className="p-3 bg-orange-100 rounded-full border border-orange-200 shadow-inner">
                  <AlertTriangle className="h-6 w-6 text-orange-600" aria-hidden="true" />
                </div>
              </div>
              <div className="flex-1 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    Action Required: Multiple Violations Detected
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200 shadow-sm">
                      {repeatOffenders.length} New Case{repeatOffenders.length !== 1 ? 's' : ''}
                    </Badge>
                  </h3>
                  <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100 uppercase tracking-wider">
                    High Priority
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4 max-w-2xl">
                  You have identified <strong>{repeatOffenders.length} student{repeatOffenders.length !== 1 ? 's' : ''}</strong> who {repeatOffenders.length !== 1 ? 'have' : 'has'} reached 3 or more security policy violations. This requires immediate administrator review to determine disciplinary steps.
                </p>
                {isAlertExpanded && (
                  <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/30 rounded-lg">
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2"><strong>Details:</strong> These students may require disciplinary action. Review their records promptly.</p>
                    <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                      {repeatOffenders.slice(0, 5).map((offender, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                          Student: {offender.student_name || 'Unknown'} - {offender.violation_count || 0} violations
                        </li>
                      ))}
                      {repeatOffenders.length > 5 && (
                        <li className="text-orange-600 dark:text-orange-400 font-semibold flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                          And {repeatOffenders.length - 5} more...
                        </li>
                      )}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={() => navigate('/security/identify-violations')}
                    className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
                  >
                    <ShieldAlert className="h-4 w-4 mr-2" />
                    Review All Violations
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsAlertExpanded(!isAlertExpanded)}
                    className="border-gray-200 hover:bg-gray-50 text-gray-700"
                  >
                    {isAlertExpanded ? 'Hide Details' : 'Show Details'}
                    <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isAlertExpanded ? 'rotate-180' : ''}`} />
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAlertDismissed(true)}
                className="text-orange-600 hover:bg-orange-200 dark:hover:bg-orange-800/50 p-1 h-8 w-8 flex-shrink-0"
                aria-label="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Time Range Selector */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Statistics Overview</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">View detections for different time periods</p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Today's Summary */}
        <MetricsGrid metrics={[
          {
            title: `Total Detections (${timeRange === '24h' ? '24h' : timeRange === 'today' ? 'Today' : timeRange === '7d' ? '7 Days' : timeRange === '30d' ? '30 Days' : 'Year'})`,
            value: todayStats.totalDetections,
            description: timeRange === 'today' ? 'Since midnight' : `In last ${timeRange === '24h' ? '24 hours' : timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : 'year'}`,
            icon: <Monitor className="h-4 w-4" />,
            color: 'blue',
            trend: todayStats.totalTrend > 0 ? 'up' : todayStats.totalTrend < 0 ? 'down' : 'neutral',
            trendValue: Math.abs(todayStats.totalTrend),
            details: 'Total number of uniform violations detected in the past 24 hours.',
          },
          {
            title: 'Compliant',
            value: todayStats.compliant,
            description: `${todayStats.complianceRate}% compliance`,
            icon: <CheckCircle className="h-4 w-4" />,
            color: 'green',
            trend: todayStats.compliantTrend > 0 ? 'up' : todayStats.compliantTrend < 0 ? 'down' : 'neutral',
            trendValue: Math.abs(todayStats.compliantTrend),
            details: 'Percentage of compliant detections.',
          },
          {
            title: 'Non-Compliant',
            value: todayStats.nonCompliant,
            description: `${todayStats.totalDetections > 0 ? (100 - todayStats.complianceRate).toFixed(1) : 0}% violations`,
            icon: <XCircle className="h-4 w-4" />,
            color: 'red',
            trend: todayStats.nonCompliantTrend > 0 ? 'up' : todayStats.nonCompliantTrend < 0 ? 'down' : 'neutral',
            trendValue: Math.abs(todayStats.nonCompliantTrend),
            details: 'Percentage of non-compliant detections.',
          },
        ]} />

        {/* Live Camera Feeds */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Camera className="h-5 w-5 text-slate-500" aria-hidden="true" />
                Live Camera Feeds
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Real-time monitoring active</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={toggleFullscreen}>
                <Monitor className="h-3.5 w-3.5 mr-2" />
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </Button>
              <Button size="sm" className="h-8 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" onClick={() => setShowAddCameraDialog(true)}>
                <Plus className="h-3.5 w-3.5 mr-2" />
                Add Camera
              </Button>
            </div>
          </div>

          <div className="p-6">
            {camerasLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading cameras...</p>
              </div>
            ) : cameras.length === 0 ? (
              <div className="text-center py-8">
                <Camera className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No cameras registered yet.</p>
                <p className="text-sm text-muted-foreground">Click "Add Camera" above to register your first camera.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {cameras.slice(0, 4).map((camera) => (
                  <div key={camera.id} className="space-y-3 group">
                    <div className="relative aspect-video bg-slate-100 dark:bg-slate-950 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                      {!camera.is_active ? (
                        // Camera is offline - show signal lost
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600">
                          <WifiOff className="h-12 w-12 mb-2 opacity-50" aria-hidden="true" />
                          <p className="text-sm font-medium">Signal Lost</p>
                        </div>
                      ) : camera.stream_url === 'test' ? (
                        // Test camera with iframe
                        <div className="w-full h-full relative">
                          <iframe
                            className="w-full h-full border-0"
                            src={`http://127.0.0.1:8000/api/camera/${camera.id}/stream/`}
                            title={`${camera.name} test stream`}
                            onLoad={() => handleCameraLoad(camera.id)}
                            onError={(e) => handleCameraError(camera.id, e)}
                          />
                          {/* Loading indicator */}
                          {cameraLoadingStates[camera.id] !== false && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
                              <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                                <p className="text-sm">Connecting...</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : camera.stream_url.startsWith('http') || camera.stream_url.startsWith('rtsp') ? (
                        // Live camera feed
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                          <img
                            className="w-full h-full object-cover"
                            src={`http://127.0.0.1:8000/api/camera/${camera.id}/stream/`}
                            alt={`${camera.name} live stream`}
                            onLoad={() => handleCameraLoad(camera.id)}
                            onError={(e) => handleCameraError(camera.id, e)}
                          />
                          {/* LIVE indicator */}
                          <div className="absolute top-2 right-2 flex gap-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/90 text-white animate-pulse">
                              LIVE
                            </span>
                          </div>
                          {/* Loading indicator */}
                          {cameraLoadingStates[camera.id] !== false && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
                              <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                                <p className="text-sm">Connecting...</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : camera.stream_url.match(/^\d+$/) ? (
                        // USB camera
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                          <img
                            className="w-full h-full object-cover"
                            src={`http://127.0.0.1:8000/api/camera/${camera.id}/stream/`}
                            alt={`${camera.name} live stream`}
                            onLoad={() => handleCameraLoad(camera.id)}
                            onError={(e) => handleCameraError(camera.id, e)}
                          />
                          {/* LIVE indicator */}
                          <div className="absolute top-2 right-2 flex gap-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/90 text-white animate-pulse">
                              LIVE
                            </span>
                          </div>
                          {/* Loading indicator */}
                          {cameraLoadingStates[camera.id] !== false && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
                              <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                                <p className="text-sm">Connecting...</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        // Fallback
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                          <img
                            className="w-full h-full object-cover"
                            src={`http://127.0.0.1:8000/api/camera/${camera.id}/stream/`}
                            alt={`${camera.name} live stream`}
                            onLoad={() => handleCameraLoad(camera.id)}
                            onError={(e) => handleCameraError(camera.id, e)}
                          />
                          {/* LIVE indicator */}
                          <div className="absolute top-2 right-2 flex gap-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/90 text-white animate-pulse">
                              LIVE
                            </span>
                          </div>
                          {/* Loading indicator */}
                          {cameraLoadingStates[camera.id] !== false && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
                              <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                                <p className="text-sm">Connecting...</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Hover overlay with camera info and settings */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="text-white">
                          <p className="text-sm font-medium">{camera.name}</p>
                          <p className="text-xs text-slate-300">{camera.location || 'Main Lobby'}</p>
                        </div>
                        <button className="p-1.5 bg-white/10 hover:bg-white/20 rounded-md backdrop-blur-sm text-white transition-colors" onClick={() => alert('Camera settings are not implemented in this demo version.')}>
                          <Settings className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {/* Status and stream info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${camera.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        <span
                          className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate max-w-[180px]"
                          title={camera.stream_url}
                        >
                          {camera.stream_url.length > 30 ? `${camera.stream_url.substring(0, 30)}...` : camera.stream_url}
                        </span>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                        camera.stream_url.startsWith('rtsp://')
                          ? 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
                          : camera.stream_url.startsWith('http') && camera.stream_url !== 'test'
                          ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800'
                          : camera.stream_url === 'test'
                          ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800'
                          : camera.stream_url.match(/^\d+$/)
                          ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                          : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800'
                      }`}>
                        {camera.stream_url.startsWith('rtsp://')
                          ? 'RTSP Stream'
                          : camera.stream_url.startsWith('http') && camera.stream_url !== 'test'
                          ? 'HTTP Stream'
                          : camera.stream_url === 'test'
                          ? 'Test Camera'
                          : camera.stream_url.match(/^\d+$/)
                          ? 'USB Camera'
                          : 'Unknown'
                        }
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Camera Management */}
        <div className="bg-card text-card-foreground rounded-xl border shadow-sm overflow-hidden">
          <div className="p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
                Camera Management
                <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {cameras.length}
                </span>
              </h3>
              <p className="text-sm text-muted-foreground">Manage your registered surveillance cameras and streams.</p>
            </div>
            <Dialog open={showAddCameraDialog} onOpenChange={setShowAddCameraDialog}>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Register New Camera
                  </DialogTitle>
                  <DialogDescription>
                    Connect a new video source to the system.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="camera-name" className="text-right">
                      Name *
                    </Label>
                    <Input
                      id="camera-name"
                      name="cameraName"
                      placeholder="e.g., Main Gate Left"
                      className="col-span-3"
                      value={newCamera.name}
                      onChange={(e) => setNewCamera({...newCamera, name: e.target.value})}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="camera-location" className="text-right">
                      Location
                    </Label>
                    <Input
                      id="camera-location"
                      name="cameraLocation"
                      placeholder="e.g., Main Gate Entrance"
                      className="col-span-3"
                      value={newCamera.location}
                      onChange={(e) => setNewCamera({...newCamera, location: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="stream-url" className="text-right pt-2">
                      Stream URL *
                    </Label>
                    <Textarea
                      id="stream-url"
                      name="streamUrl"
                      placeholder="e.g., rtsp://192.168.1.20:554/stream, http://192.168.1.100:8080/video, or 0"
                      className="col-span-3"
                      rows={3}
                      value={newCamera.stream_url}
                      onChange={(e) => setNewCamera({...newCamera, stream_url: e.target.value})}
                      required
                    />
                  </div>

                  <div className="col-span-4">
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-1">Stream URL Examples:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Test Camera:</strong> <code className="bg-green-100 px-1 rounded text-green-800">test</code> (for development testing)</li>
                        <li>IP Camera: <code className="bg-muted px-1 rounded">rtsp://username:password@192.168.1.20:554/stream</code></li>
                        <li><strong>Android IP Webcam (with auth):</strong> <code className="bg-blue-100 px-1 rounded text-blue-800">http://username:password@192.168.137.81:8080/video</code></li>
                        <li>Android IP Webcam (no auth): <code className="bg-muted px-1 rounded">http://192.168.137.81:8080/video</code></li>
                        <li>USB Camera: <code className="bg-muted px-1 rounded">0</code>, <code className="bg-muted px-1 rounded">1</code>, <code className="bg-muted px-1 rounded">2</code></li>
                        <li>WebRTC: <code className="bg-muted px-1 rounded">webrtc://android-camera</code></li>
                      </ul>
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="font-medium text-blue-900 mb-1">📱 Android Camera Setup:</p>
                        <ol className="text-blue-800 text-sm space-y-1">
                          <li>1. Install "IP Webcam" app from Google Play Store</li>
                          <li>2. Open the app and start the server</li>
                          <li>3. Use the HTTP URL shown in the app (e.g., http://192.168.1.100:8080/video)</li>
                          <li>4. Make sure your Android device and computer are on the same WiFi network</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button 
                    type="submit" 
                    onClick={createCamera}
                    disabled={isCreatingCamera}
                  >
                    {isCreatingCamera ? 'Registering...' : 'Register Camera'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="p-0">
            {camerasLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading cameras...</p>
              </div>
            ) : cameras.length === 0 ? (
              <div className="p-12 text-center">
                <div className="p-4 rounded-full bg-slate-100 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Camera className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No cameras registered</h3>
                <p className="text-muted-foreground mb-6">Get started by adding your first surveillance camera.</p>
                <Dialog open={showAddCameraDialog} onOpenChange={setShowAddCameraDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Camera
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {cameras.map((camera) => (
                  <div key={camera.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="p-2.5 rounded-lg border shadow-sm shrink-0 bg-white border-slate-200">
                        <Camera className="h-6 w-6 text-slate-400" />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-foreground truncate">{camera.name}</h4>
                          <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                            {camera.stream_url.startsWith('rtsp://') ? 'RTSP' : camera.stream_url.startsWith('http') ? 'HTTP' : 'USB'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{camera.location || 'Main Lobby'}</p>
                        <div className="block sm:hidden mt-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-slate-100 p-2 rounded border max-w-full overflow-hidden">
                            <span className="truncate flex-1 font-mono">{camera.stream_url}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col flex-1 gap-2 min-w-0 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative group/url">
                          <div className="w-full text-xs font-mono text-muted-foreground bg-slate-50 border border-slate-200 rounded px-2 py-1.5 truncate cursor-pointer hover:border-slate-300 transition-colors flex items-center justify-between">
                            <span className="truncate">{camera.stream_url}</span>
                            <button
                              className="opacity-0 group-hover/url:opacity-100 text-slate-400 hover:text-slate-600 ml-2 shrink-0 transition-opacity"
                              onClick={() => navigator.clipboard.writeText(camera.stream_url)}
                              title="Copy URL"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy h-3 w-3">
                                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-dashed">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        camera.is_active 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {camera.is_active ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wifi h-3 w-3" aria-hidden="true">
                            <path d="M12 20h.01"></path>
                            <path d="M8.5 16.429a5 5 0 0 1 7 0"></path>
                            <path d="M5 12.859a10 10 0 0 1 14 0"></path>
                            <path d="M2 8.82a15 15 0 0 1 20 0"></path>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wifi-off h-3 w-3" aria-hidden="true">
                            <path d="M12 20h.01"></path>
                            <path d="M8.5 16.429a5 5 0 0 1 7 0"></path>
                            <path d="M5 12.859a10 10 0 0 1 5.17-2.69"></path>
                            <path d="M19 12.859a10 10 0 0 0-2.007-1.523"></path>
                            <path d="M2 8.82a15 15 0 0 1 4.177-2.643"></path>
                            <path d="M22 8.82a15 15 0 0 0-11.288-3.764"></path>
                            <path d="m2 2 20 20"></path>
                          </svg>
                        )}
                        {camera.is_active ? 'Active' : 'Inactive'}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className={`h-8 w-8 inline-flex items-center justify-center rounded-md border transition-colors focus:ring-2 focus:ring-ring focus:outline-none shadow-sm ${
                            camera.is_active
                              ? 'bg-red-600 border-red-600 text-white hover:bg-red-700'
                              : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                          title={camera.is_active ? 'Stop Camera' : 'Start Camera'}
                          onClick={() => toggleCameraStatus(camera.id, camera.name, camera.is_active)}
                        >
                          {camera.is_active ? (
                            <Square className="h-3.5 w-3.5 fill-current" />
                          ) : (
                            <Play className="h-3.5 w-3.5 fill-current" />
                          )}
                        </button>
                        <button
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-ring focus:outline-none"
                          title="Edit Configuration"
                          onClick={() => {
                            console.log('Edit button clicked for camera:', camera.name);
                            openEditCameraDialog(camera);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-transparent text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors focus:ring-2 focus:ring-red-500 focus:outline-none"
                          title="Delete Camera"
                          onClick={() => deleteCamera(camera.id, camera.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-slate-50/50 p-4 border-t text-xs text-muted-foreground flex justify-between items-center">
              <span>System Status: <span className="text-emerald-600 font-medium">Online</span></span>
              <span>Last updated: just now</span>
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        <AlertsCard alerts={recentAlerts.map(alert => ({
          ...alert,
          severity: Math.random() > 0.5 ? 'High' : Math.random() > 0.5 ? 'Medium' : 'Low',
          details: `Uniform violation detected at ${alert.camera}. Immediate attention required.`
        }))} />
      </main>
    </div>
  );
}