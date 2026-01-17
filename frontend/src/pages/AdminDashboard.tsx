import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Slider } from '../components/ui/slider';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Users,
  CheckCircle,
  XCircle,
  Camera,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  TrendingDown,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  Info,
  RefreshCw,
  Monitor
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('24h');
  const [stats, setStats] = useState({
    totalStudents: 0,
    compliant: 0,
    nonCompliant: 0,
    activeAlerts: 0,
    complianceRate: 0,
    totalTrend: 0,
    compliantTrend: 0,
    nonCompliantTrend: 0
  });

  const [recentLogs, setRecentLogs] = useState([]);
  const [recentViolations, setRecentViolations] = useState([]);
  const [repeatOffenders, setRepeatOffenders] = useState([]);
  const [identifiedViolations, setIdentifiedViolations] = useState([]);
  const [activeCameras, setActiveCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAlertExpanded, setIsAlertExpanded] = useState(false);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
  const [expandedMetricCard, setExpandedMetricCard] = useState<number | null>(null);
  const [expandedViolation, setExpandedViolation] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [animatedStats, setAnimatedStats] = useState({
    totalStudents: 0,
    compliant: 0,
    nonCompliant: 0,
    activeAlerts: 0
  });

  const fetchData = async () => {
    try {
      const token = 'mock-token'; // For now, using mock token since auth is not fully integrated
      const [statsResponse, logsResponse, violationsResponse, reviewResponse, allViolationsResponse, camerasResponse] = await Promise.all([
        axios.get(`http://localhost:8000/api/security/stats/?range=${timeRange}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8000/api/dashboard/recent-logs/', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8000/api/management/violations/?identified=true&ordering=-timestamp', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8000/api/violations/review/', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8000/api/management/violations/?identified=true&sent_to_admin=true&ordering=-timestamp', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8000/api/camera/active/', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

        // Map API response to include totalStudents for backward compatibility
        const mappedStats = {
          ...statsResponse.data,
          totalStudents: statsResponse.data.totalDetections,
          activeAlerts: statsResponse.data.nonCompliant
        };
        setStats(mappedStats);
        setRecentLogs(logsResponse.data);
        setRecentViolations(violationsResponse.data?.slice(0, 5) || []);
        setRepeatOffenders(reviewResponse.data.repeat_offenders || []);
        setIdentifiedViolations(allViolationsResponse.data?.results || allViolationsResponse.data || []);
        setActiveCameras(camerasResponse.data.cameras || []);
        
        // Animate stats
        const targetStats = mappedStats;
        const duration = 1000; // 1 second
        const steps = 50;
        const stepDuration = duration / steps;
        
        let step = 0;
        const interval = setInterval(() => {
          step++;
          const progress = step / steps;
          setAnimatedStats({
            totalStudents: Math.floor(targetStats.totalStudents * progress),
            compliant: Math.floor(targetStats.compliant * progress),
            nonCompliant: Math.floor(targetStats.nonCompliant * progress),
            activeAlerts: Math.floor(targetStats.activeAlerts * progress)
          });
          
          if (step >= steps) {
            clearInterval(interval);
            setAnimatedStats(targetStats);
          }
        }, stepDuration);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);  const refreshDashboard = async () => {
    setIsRefreshing(true);
    try {
      await fetchData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Auto-refresh active cameras every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const token = 'mock-token';
        const response = await axios.get('http://localhost:8000/api/camera/active/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setActiveCameras(response.data.cameras || []);
      } catch (error) {
        console.error('Error refreshing cameras:', error);
      }
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Helper function to get department full name
  const getDepartmentName = (code: string) => {
    const departments: { [key: string]: string } = {
      'SAS': 'Arts and Sciences',
      'STCS': 'Technology and Computer Studies',
      'SOE': 'Engineering',
      'STE': 'Teacher Education',
      'SCJE': 'Criminal Justice Education',
      'SME': 'Management and Entrepreneurship',
      'SNHS': 'Nursing and Health Sciences',
      'LHS': 'Laboratory High School'
    };
    return departments[code] || code;
  };

  // Helper function to download file
  const downloadFile = (content: Blob | string, filename: string, mimeType: string) => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Export Repeat Offenders (3+ violations) to CSV
  const exportRepeatOffendersCSV = () => {
    setIsExporting(true);
    try {
      const headers = ['Student Name', 'Department', 'Gender', 'Total Violations', 'Latest Violation Date', 'Status'];
      const rows = repeatOffenders.map((student: any) => [
        student.student_name || 'Unknown',
        getDepartmentName(student.department) || 'N/A',
        student.gender === 'M' ? 'Male' : 'Female',
        student.violation_count || 0,
        student.latest_violation ? new Date(student.latest_violation).toLocaleString() : 'N/A',
        student.violation_count >= 3 ? 'Requires Action' : 'Monitored'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      downloadFile(csvContent, `repeat_offenders_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
      alert('Repeat offenders report downloaded successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export All Reported Violations to CSV
  const exportAllViolationsCSV = () => {
    setIsExporting(true);
    try {
      const headers = ['Student Name', 'Department', 'Gender', 'Camera', 'Location', 'Date & Time', 'Notes', 'Reported By'];
      const rows = identifiedViolations.map((violation: any) => [
        violation.student_name || 'Unknown',
        getDepartmentName(violation.department) || 'N/A',
        violation.gender === 'M' ? 'Male' : 'Female',
        violation.camera_name || 'N/A',
        violation.camera_location || 'N/A',
        new Date(violation.timestamp).toLocaleString(),
        violation.notes || 'No notes',
        'Security Personnel'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      downloadFile(csvContent, `all_violations_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
      alert('All violations report downloaded successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Administrator Dashboard</h1>
          <p className="text-muted-foreground">Monitor uniform compliance and manage violations</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={toggleFullscreen}
            variant="outline"
            className="h-8 px-3 text-xs rounded-md"
          >
            <Monitor className="h-3.5 w-3.5 mr-2" />
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </Button>
          <Button 
            onClick={refreshDashboard} 
            disabled={isRefreshing}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

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

      {/* Alert Banner for Repeat Offenders */}
      {repeatOffenders.length > 0 && !isAlertDismissed && (
        <Alert className="border-red-600 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <AlertTriangle className="h-6 w-6 text-red-600 mt-1" />
              <div className="flex-1">
                <AlertTitle className="text-lg font-semibold text-red-900 dark:text-red-100">
                  Urgent: Repeat Offenders Detected
                </AlertTitle>
                <AlertDescription className="mt-2 text-red-700 dark:text-red-300">
                  {repeatOffenders.length} student{repeatOffenders.length > 1 ? 's' : ''} has 3 or more uniform violations and require immediate review.
                </AlertDescription>
                <div className="mt-4 flex gap-2 flex-wrap">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          onClick={() => navigate('/admin/review-violations')}
                          variant="destructive" 
                          className="bg-red-600 hover:bg-red-700 shadow-md hover:shadow-lg transition-shadow"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review Now ({repeatOffenders.length} student{repeatOffenders.length > 1 ? 's' : ''})
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View detailed offender information</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="border-red-300 hover:bg-red-50 dark:hover:bg-red-900/10"
                          onClick={exportRepeatOffendersCSV}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export Report
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Download offender report</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Collapsible open={isAlertExpanded} onOpenChange={setIsAlertExpanded}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                  >
                    {isAlertExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span className="sr-only">Toggle details</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="absolute left-0 right-0 mt-4 space-y-2 px-4 pb-4">
                  {repeatOffenders.map((offender, index) => (
                    <div key={index} className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-red-900 dark:text-red-100">{offender.name || 'Unknown Student'}</p>
                          <p className="text-sm text-red-700 dark:text-red-300">{offender.department || 'Unknown Department'}</p>
                        </div>
                        <Badge variant="destructive" className="text-sm">
                          {offender.violations} Violations
                        </Badge>
                      </div>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Last violation: {offender.lastViolation ? new Date(offender.lastViolation).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setIsAlertDismissed(true)} 
                      className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Dismiss alert</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Dismiss this alert</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </Alert>
      )}

      {/* Stats Cards with Animations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Detections Card */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Detections ({timeRange === '24h' ? '24h' : timeRange === 'today' ? 'Today' : timeRange === '7d' ? '7d' : timeRange === '30d' ? '30d' : '1y'})</CardTitle>
            <div className="p-2 rounded-lg text-blue-600 bg-blue-50 dark:bg-blue-900/20">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-foreground">{animatedStats.totalStudents}</div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{timeRange === 'today' ? 'Since midnight' : `Last ${timeRange === '24h' ? '24 hours' : timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : 'year'}`}</p>
                <div className="flex items-center gap-1">
                  {stats.totalTrend > 0 ? <TrendingUp className="h-3 w-3 text-red-600" /> : stats.totalTrend < 0 ? <TrendingDown className="h-3 w-3 text-green-600" /> : null}
                  <span className="text-xs font-medium text-muted-foreground">{Math.abs(stats.totalTrend)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliant Card */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliant</CardTitle>
            <div className="p-2 rounded-lg text-green-600 bg-green-50 dark:bg-green-900/20">
              <CheckCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-green-600">{animatedStats.compliant}</div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {stats.complianceRate.toFixed(1)}% compliance rate
                </p>
                <div className="flex items-center gap-1">
                  {stats.compliantTrend > 0 ? <TrendingUp className="h-3 w-3 text-green-600" /> : stats.compliantTrend < 0 ? <TrendingDown className="h-3 w-3 text-red-600" /> : null}
                  <span className="text-xs font-medium text-green-600">{Math.abs(stats.compliantTrend)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Non-Compliant Card */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Non-Compliant</CardTitle>
            <div className="p-2 rounded-lg text-red-600 bg-red-50 dark:bg-red-900/20">
              <XCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-red-600">{animatedStats.nonCompliant}</div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {stats.totalStudents > 0 
                    ? ((stats.nonCompliant / stats.totalStudents) * 100).toFixed(1) 
                    : 0}% violation rate
                </p>
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-xs font-medium text-red-600">3%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Camera Feed */}
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
                    {/* Live indicator */}
                    <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                      <span className="animate-pulse">●</span>
                      LIVE
                    </div>
                  </div>

                  {/* Camera Info */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{camera.name}</h4>
                      <Badge className="bg-green-50 text-green-700 border-green-200">
                        ● Active
                      </Badge>
                    </div>
                    {camera.location && (
                      <p className="text-sm text-muted-foreground">{camera.location}</p>
                    )}
                    {camera.last_streamed_by_username && (
                      <p className="text-xs text-muted-foreground">
                        Monitored by: {camera.last_streamed_by_username}
                      </p>
                    )}
                    {camera.last_streamed_at && (
                      <p className="text-xs text-muted-foreground">
                        Started: {new Date(camera.last_streamed_at).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Identified Violations with Enhanced Styling */}
      <Card className="shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Recent Identified Violations
          </CardTitle>
          <CardDescription>Students identified by Security Personnel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentViolations.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <p className="text-muted-foreground">No recent violations</p>
                <p className="text-xs text-muted-foreground mt-2">Identified violations will appear here</p>
              </div>
            ) : (
              recentViolations.map((violation) => (
                <div key={violation.id} className="border border-border rounded-lg hover:shadow-md transition-shadow bg-white dark:bg-slate-800">
                  <div className="flex items-start gap-3 p-3">
                    <img 
                      src={violation.image_url || `http://localhost:8000${violation.image}`} 
                      alt="Violation" 
                      className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setSelectedImage(violation.image_url || `http://localhost:8000${violation.image}`)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{violation.student_name}</p>
                        {violation.sent_to_admin && (
                          <Badge variant="destructive" className="text-xs">Flagged</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>{violation.department_display} • {violation.gender === 'M' ? 'Male' : 'Female'}</div>
                        <div>{violation.camera_name}</div>
                        <div>{new Date(violation.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col gap-1">
                      <Badge variant="outline" className="text-xs">{violation.violation_count || 1} violations</Badge>
                      {!violation.reviewed && violation.sent_to_admin && (
                        <Badge variant="secondary" className="text-xs">Needs Review</Badge>
                      )}
                      <Collapsible open={expandedViolation === violation.id} onOpenChange={() => setExpandedViolation(expandedViolation === violation.id ? null : violation.id)}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                            {expandedViolation === violation.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            <span className="sr-only">Toggle details</span>
                          </Button>
                        </CollapsibleTrigger>
                      </Collapsible>
                    </div>
                  </div>
                  <Collapsible open={expandedViolation === violation.id}>
                    <CollapsibleContent className="px-3 pb-3 pt-0">
                      <div className="border-t border-border pt-3 space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {violation.notes || 'Violation detected by security personnel. Additional details may be added during review.'}
                        </p>
                        <div className="flex gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-xs flex-1"
                                  onClick={() => navigate('/admin/review-violations')}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View Details
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View full violation details and history</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-xs flex-1"
                                  onClick={() => setSelectedImage(violation.image_url || `http://localhost:8000${violation.image}`)}
                                >
                                  <Info className="h-3 w-3 mr-1" />
                                  View Image
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View full-size violation snapshot</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))
            )}
          </div>
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={() => navigate('/admin/review-violations')}
          >
            View All Violations
          </Button>
        </CardContent>
      </Card>

      {/* Image Zoom Modal */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Violation Image - Full View</DialogTitle>
              <DialogDescription>High-resolution view of the violation snapshot</DialogDescription>
            </DialogHeader>
            <img 
              src={selectedImage} 
              alt="Violation" 
              className="w-full h-auto rounded-lg shadow-lg" 
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}