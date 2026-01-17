import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Progress } from '../components/ui/progress';
import { Checkbox } from '../components/ui/checkbox';
import { useAuth } from '../hooks/useAuth';
import { XCircle, CheckCircle, AlertTriangle, User, Building2, Calendar, Camera, Eye, Download, Search, Filter, SortAsc, Trash2, ZoomIn, EllipsisVertical } from 'lucide-react';

interface ViolationLog {
  id: number;
  image: string;
  image_url?: string;
  timestamp: string;
  camera_name: string;
  camera_location: string;
  student_name: string;
  department: string;
  department_display: string;
  gender: string;
  notes: string;
  confidence: number;
  identified: boolean;
  reviewed: boolean;
  sent_to_admin: boolean;
}

interface ComplianceDetection {
  id: number;
  timestamp: string;
  status: 'compliant' | 'non-compliant';
  confidence: number;
  camera_name: string;
  camera_location: string;
}

export default function ComplianceLogs() {
  const [identifiedViolations, setIdentifiedViolations] = useState<ViolationLog[]>([]);
  const [allDetections, setAllDetections] = useState<ComplianceDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedViolations, setSelectedViolations] = useState<number[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // Fetch both identified violations AND all compliance detections
        const [violationsResponse, detectionsResponse] = await Promise.all([
          axios.get('http://localhost:8000/api/management/violations/?identified=true&ordering=-timestamp'),
          axios.get('http://localhost:8000/api/compliance-detections/?ordering=-timestamp')
        ]);

        setIdentifiedViolations(violationsResponse.data.results || violationsResponse.data || []);
        setAllDetections(detectionsResponse.data.results || detectionsResponse.data || []);
      } catch (error) {
        console.error('Error fetching compliance logs:', error);
        // Set empty arrays on error
        setIdentifiedViolations([]);
        setAllDetections([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [user]);

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

  // Filter and sort violations
  const filteredViolations = identifiedViolations
    .filter(v =>
      v.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.department.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(v => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'sent-to-admin') return v.sent_to_admin;
      if (filterStatus === 'reviewed') return v.reviewed;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      if (sortBy === 'name') return a.student_name.localeCompare(b.student_name);
      if (sortBy === 'confidence') return b.confidence - a.confidence;
      return 0;
    });

  // Handle checkbox selection
  const handleSelectViolation = (id: number) => {
    setSelectedViolations(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  // Bulk export to CSV
  const handleBulkExport = () => {
    const selectedData = identifiedViolations.filter(v => selectedViolations.includes(v.id));
    const headers = ['Student Name', 'Department', 'Gender', 'Camera', 'Date & Time', 'Confidence', 'Status'];
    const rows = selectedData.map(v => [
      v.student_name,
      getDepartmentName(v.department),
      v.gender === 'M' ? 'Male' : 'Female',
      v.camera_name,
      new Date(v.timestamp).toLocaleString(),
      `${v.confidence}%`,
      v.sent_to_admin ? 'Sent to Admin' : 'Pending'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `violations_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    alert(`Exported ${selectedViolations.length} violation(s) successfully!`);
  };

  // Bulk delete (would need backend endpoint)
  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedViolations.length} violation(s)?`)) return;

    try {
      // TODO: Implement bulk delete API call
      console.log('Deleting:', selectedViolations);
      setIdentifiedViolations(prev => prev.filter(v => !selectedViolations.includes(v.id)));
      setSelectedViolations([]);
      alert('Violations deleted successfully!');
    } catch (error) {
      console.error('Error deleting violations:', error);
      alert('Failed to delete violations.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading compliance logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Compliance Logs</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor and manage identified violations in real-time.</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <label htmlFor="compliance-search" className="sr-only">Search by student name or department</label>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="compliance-search"
            name="complianceSearch"
            placeholder="Search by student name or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="sent-to-admin">Sent to Admin</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48">
            <SortAsc className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date (Newest)</SelectItem>
            <SelectItem value="name">Student Name</SelectItem>
            <SelectItem value="confidence">Confidence</SelectItem>
          </SelectContent>
        </Select>
        {selectedViolations.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBulkExport}>
              <Download className="h-4 w-4 mr-2" />
              Export ({selectedViolations.length})
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedViolations.length})
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="identified" className="space-y-4">
        <TabsList>
          <TabsTrigger value="identified">
            <User className="h-4 w-4 mr-2" />
            Identified Violations ({identifiedViolations.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            <Camera className="h-4 w-4 mr-2" />
            All Detections ({allDetections.length})
          </TabsTrigger>
        </TabsList>

        {/* Identified Violations Tab */}
        <TabsContent value="identified">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-indigo-500" />
                Identified Violations
              </h3>
              <span className="text-xs text-slate-500 uppercase font-medium tracking-wider">
                {filteredViolations.length} Records found
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredViolations.length === 0 ? (
                <div className="text-center py-12">
                  {searchTerm || filterStatus !== 'all' ? (
                    <>
                      <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-orange-500 opacity-50" />
                      <p className="text-slate-500">No violations match the current filters.</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => {
                          setSearchTerm('');
                          setFilterStatus('all');
                        }}
                      >
                        Clear Filters
                      </Button>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500 opacity-50" />
                      <h4 className="text-lg font-semibold text-slate-700 mb-2">No violations found</h4>
                      <p className="text-slate-500">All students are currently compliant!</p>
                    </>
                  )}
                </div>
              ) : (
                filteredViolations.map((violation) => (
                  <div key={violation.id} className="group relative p-4 sm:p-6 hover:bg-slate-50 transition-all duration-200 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                    <div className="flex items-start gap-4">
                      <label htmlFor={`violation-${violation.id}`} className="sr-only">Select violation {violation.id}</label>
                      <input
                        id={`violation-${violation.id}`}
                        name={`violation-checkbox-${violation.id}`}
                        type="checkbox"
                        className="mt-2 sm:mt-0 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                        checked={selectedViolations.includes(violation.id)}
                        onChange={() => handleSelectViolation(violation.id)}
                      />
                      <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 shadow-sm group-hover:shadow-md transition-shadow">
                        <img
                          alt="Violation"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          src={violation.image_url || `http://localhost:8000${violation.image}`}
                          onClick={() => setSelectedImage(violation.image_url || `http://localhost:8000${violation.image}`)}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-base font-semibold text-slate-900 truncate">{violation.student_name}</h4>
                        <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                          Uniform Violation
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[200px]">{getDepartmentName(violation.department)}</span>
                        </div>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          <span>{violation.gender === 'M' ? 'Male' : 'Female'}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-2">
                        <div className="flex items-center gap-1">
                          <Camera className="h-3 w-3" />
                          {violation.camera_name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(violation.timestamp).toLocaleDateString()} {new Date(violation.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-4 sm:gap-3 w-full sm:w-auto justify-between sm:justify-center border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0 mt-2 sm:mt-0">
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2 mb-1">
                          <span className="text-xs font-medium text-slate-500">Confidence</span>
                          <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent ${
                            violation.confidence >= 0.8 ? 'bg-green-500/15 text-green-700 hover:bg-green-500/25' :
                            violation.confidence >= 0.6 ? 'bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/25' :
                            'bg-red-500/15 text-red-700 hover:bg-red-500/25'
                          }`}>
                            {Math.round(violation.confidence * 100)}%
                          </div>
                        </div>
                        <div className="h-1.5 w-24 sm:w-32 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              violation.confidence >= 0.8 ? 'bg-green-500' :
                              violation.confidence >= 0.6 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${violation.confidence * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 px-3 text-xs h-8 w-8 p-0 rounded-full"
                          title="Zoom Image"
                          onClick={() => setSelectedImage(violation.image_url || `http://localhost:8000${violation.image}`)}
                        >
                          <ZoomIn className="h-4 w-4 text-slate-600" />
                        </button>
                        <button className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 text-xs h-8 text-xs">
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          View Full
                        </button>
                        <button className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 px-3 text-xs h-8 w-8 p-0 rounded-full sm:hidden">
                          <EllipsisVertical className="h-4 w-4 text-slate-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {filteredViolations.length > 0 && (
              <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50/50">
                <span className="text-sm text-slate-500">
                  Showing 1-{Math.min(filteredViolations.length, 10)} of {filteredViolations.length}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* All Detections Tab */}
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Compliance Detections</CardTitle>
              <CardDescription>
                Complete history of all detections (compliant and non-compliant)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allDetections.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No detections available</p>
                  </div>
                ) : (
                  allDetections.map((detection) => (
                    <div key={detection.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {detection.status === 'compliant' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium capitalize">{detection.status.replace('-', ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            {detection.camera_name} {detection.camera_location && `• ${detection.camera_location}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {new Date(detection.timestamp).toLocaleString()}
                        </p>
                        <Badge variant={detection.status === 'compliant' ? 'default' : 'destructive'} className="mt-1">
                          {detection.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
              alt="Violation full view"
              className="w-full h-auto rounded-lg shadow-lg"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}