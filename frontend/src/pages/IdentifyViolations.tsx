import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, User, Building2, UserCircle2, FileText, AlertTriangle, RefreshCw, Search, Filter, Calendar, Camera, ZoomIn, Save, CheckCircle, Hash, UserPlus, EllipsisVertical, Eye, BarChart3, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';

interface Violation {
  id: number;
  image: string;
  image_url?: string;
  timestamp: string;
  camera_name: string;
  camera_location: string;
  confidence: number;
  student_id?: string;
  student_name?: string;
  department?: string;
  gender?: string;
}

export default function IdentifyViolations() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'identify' | 'view'>('identify');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCamera, setFilterCamera] = useState('all');
  const [filterConfidence, setFilterConfidence] = useState('all');
  const [imageZoomed, setImageZoomed] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [violationToDelete, setViolationToDelete] = useState<Violation | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    student_id: '',
    student_name: '',
    department: '',
    gender: '',
    notes: ''
  });

  useEffect(() => {
    fetchUnidentifiedViolations();
  }, []);

  // Filter violations based on search and filters
  const filteredViolations = violations.filter((v) => {
    const matchesSearch = v.camera_location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.camera_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCamera = filterCamera === 'all' || v.camera_name === filterCamera;
    const matchesConfidence =
      filterConfidence === 'all' ||
      (filterConfidence === 'high' && v.confidence >= 0.9) ||
      (filterConfidence === 'medium' && v.confidence >= 0.8 && v.confidence < 0.9) ||
      (filterConfidence === 'low' && v.confidence < 0.8);
    return matchesSearch && matchesCamera && matchesConfidence;
  });

  // Get unique cameras for filter dropdown
  const uniqueCameras = Array.from(new Set(violations.map(v => v.camera_name).filter(Boolean)));

  useEffect(() => {
    fetchUnidentifiedViolations();
  }, []);

  const fetchUnidentifiedViolations = async () => {
    setRefreshing(true);
    try {
      const response = await axios.get('http://localhost:8000/api/violations/unidentified/');
      setViolations(response.data.violations || []);
    } catch (error) {
      console.error('Error fetching violations:', error);
      toast({
        title: "Error",
        description: "Failed to load violations",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleIdentify = (violation: Violation) => {
    setSelectedViolation(violation);
    setDialogMode('identify');
    setFormData({
      student_id: '',
      student_name: '',
      department: '',
      gender: '',
      notes: ''
    });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const handleViewDetails = (violation: Violation) => {
    setSelectedViolation(violation);
    setDialogMode('view');
    setIsDialogOpen(true);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.student_id.trim()) newErrors.student_id = 'Student ID is required';
    if (!formData.student_name.trim()) newErrors.student_name = 'Student name is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraft = () => {
    // Save to local storage
    if (selectedViolation) {
      localStorage.setItem(`violation_draft_${selectedViolation.id}`, JSON.stringify(formData));
      toast({
        title: "Draft Saved",
        description: "Your progress has been saved",
      });
    }
  };

  const handleSubmit = async () => {
    if (!selectedViolation) return;

    if (!validateForm()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(
        `http://localhost:8000/api/violations/${selectedViolation.id}/identify/`,
        formData
      );

      toast({
        title: "Student Identified",
        description: response.data.sent_to_admin 
          ? `⚠️ Sent to admin (${response.data.violation_count} violations detected)` 
          : "Violation recorded successfully",
        variant: response.data.sent_to_admin ? "destructive" : "default"
      });

      // Clear draft
      localStorage.removeItem(`violation_draft_${selectedViolation.id}`);
      
      setIsDialogOpen(false);
      fetchUnidentifiedViolations();
    } catch (error) {
      console.error('Error identifying violation:', error);
      toast({
        title: "Error",
        description: "Failed to identify student",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (violation: Violation) => {
    setViolationToDelete(violation);
    setDeleteDialogOpen(true);
  };

  const deleteViolation = async () => {
    if (!violationToDelete) return;

    try {
      await axios.delete(`http://localhost:8000/api/management/violations/${violationToDelete.id}/`);
      
      // Remove from local state
      setViolations(prev => prev.filter(v => v.id !== violationToDelete.id));
      
      toast({
        title: "Success",
        description: "Violation deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting violation:', error);
      toast({
        title: "Error",
        description: "Failed to delete violation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setViolationToDelete(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-muted/20 to-muted/40 min-h-screen">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Identify Violations</h1>
            <p className="text-sm text-slate-500 mt-1">Review and assign student identities to captured incidents.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {filteredViolations.length} Pending
            </span>
            <Button
              onClick={fetchUnidentifiedViolations}
              disabled={refreshing}
              className="inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50 active:scale-95 bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-sm h-8 px-3 text-xs"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 group">
            <label htmlFor="violation-search" className="sr-only">Search by location or camera ID</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              id="violation-search"
              name="violationSearch"
              type="text"
              placeholder="Search by location or camera ID..."
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-4 overflow-x-auto pb-1 lg:pb-0">
            <div className="w-48 shrink-0">
              <div className="relative">
                <Camera className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <select
                  id="filter-camera"
                  name="filter-camera"
                  className="w-full h-10 pl-10 pr-8 appearance-none rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
                  value={filterCamera}
                  onChange={(e) => setFilterCamera(e.target.value)}
                >
                  <option value="all">All Cameras</option>
                  {uniqueCameras.map((camera) => (
                    <option key={camera} value={camera}>{camera}</option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300 pointer-events-none" />
              </div>
            </div>
          <div className="w-full md:w-48">
            <Label htmlFor="filter-confidence" className="sr-only">Filter by confidence</Label>
            <Select value={filterConfidence} onValueChange={setFilterConfidence}>
              <SelectTrigger id="filter-confidence" className="w-full" aria-label="Filter by confidence level">
                <SelectValue placeholder="Filter by confidence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Confidence</SelectItem>
                <SelectItem value="high">High (≥80%)</SelectItem>
                <SelectItem value="medium">Medium (60-79%)</SelectItem>
                <SelectItem value="low">Low (&lt;60%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Unidentified Violations ({filteredViolations.length})
            </CardTitle>
            <CardDescription>
              Click on a violation to identify the student
            </CardDescription>
          </CardHeader>
          <CardContent>
            {refreshing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <Skeleton className="w-full h-48 rounded-lg mb-3" />
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredViolations.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground font-medium">
                  {violations.length === 0 ? 'No unidentified violations' : 'No violations found matching your criteria.'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {violations.length === 0 ? 'All captured violations have been processed' : 'Try adjusting your search or filters'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredViolations.map((violation) => (
                  <div
                    key={violation.id}
                    className="group bg-white rounded-xl border border-slate-200/60 overflow-hidden hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-200 transition-all duration-300 flex flex-col"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                      <img
                        src={violation.image_url || `http://localhost:8000${violation.image}`}
                        alt={`Violation at ${violation.camera_location}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 bg-red-100 text-red-700 border border-red-200 shadow-sm backdrop-blur-sm bg-red-50/90 border-red-200">
                          Non-Compliant
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 bg-blue-50 text-blue-700 border border-blue-200 shadow-sm backdrop-blur-sm bg-white/90">
                          {(violation.confidence * 100).toFixed(0)}% Match
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-[2px]">
                        <Button
                          className="inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50 active:scale-95 bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-sm h-8 px-3 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(violation);
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-slate-900 text-sm line-clamp-1" title={violation.camera_location}>
                            {violation.camera_location}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1 text-slate-500">
                            <Camera className="h-3 w-3 text-slate-400" aria-hidden="true" />
                            <span className="text-xs font-medium">{violation.camera_name}</span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-50 transition-colors">
                              <EllipsisVertical className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(violation);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="mt-auto space-y-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-md border border-slate-100">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                          <span className="truncate">{new Date(violation.timestamp).toLocaleString()}</span>
                        </div>
                        <Button
                          className="inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50 active:scale-95 bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md h-10 px-4 py-2 text-sm w-full group/btn"
                          onClick={() => handleIdentify(violation)}
                        >
                          <UserPlus className="h-4 w-4 mr-2 transition-transform group-hover/btn:scale-110" aria-hidden="true" />
                          Identify Student
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Identification Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              {dialogMode === 'identify' ? (
                <>
                  <User className="h-5 w-5" />
                  Identify Student
                </>
              ) : (
                <>
                  <Eye className="h-5 w-5" />
                  Violation Details
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'identify'
                ? 'Fill in the student\'s information for this violation. All fields marked with * are required.'
                : 'View detailed information about this violation snapshot.'
              }
            </DialogDescription>
          </DialogHeader>

          {selectedViolation && (
            <div className="space-y-8">
              {/* Violation Image */}
              <div className="relative group">
                <div className="relative overflow-hidden rounded-xl bg-slate-100 shadow-lg">
                  <img
                    src={selectedViolation.image_url || `http://localhost:8000${selectedViolation.image}`}
                    alt="Violation"
                    className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                    onClick={() => setImageZoomed(true)}
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-white/90 text-slate-900 hover:bg-white shadow-lg backdrop-blur-sm"
                      onClick={() => setImageZoomed(true)}
                    >
                      <ZoomIn className="h-4 w-4 mr-2" />
                      View Full Size
                    </Button>
                  </div>
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-red-500/90 text-white border border-red-400/50 shadow-lg backdrop-blur-sm">
                      Violation Detected
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-blue-500/90 text-white border border-blue-400/50 shadow-lg backdrop-blur-sm">
                      {(selectedViolation.confidence * 100).toFixed(0)}% Confidence
                    </span>
                  </div>
                </div>
              </div>

              {dialogMode === 'identify' ? (
                <>
                  {/* Form Fields */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                      <Label htmlFor="student_id" className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        Student ID *
                      </Label>
                      <div className="relative">
                        <Input
                          id="student_id"
                          name="student_id"
                          type="text"
                          placeholder="2021-12345"
                          value={formData.student_id}
                          onChange={(e) => handleInputChange('student_id', e.target.value)}
                          className={`h-11 pl-4 pr-4 rounded-lg border transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${formErrors.student_id ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200'}`}
                          autoComplete="username"
                          autoFocus
                          required
                        />
                      </div>
                      {formErrors.student_id && <p className="text-sm text-red-600">{formErrors.student_id}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="student_name" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Student Name *
                      </Label>
                      <div className="relative">
                        <Input
                          id="student_name"
                          name="student_name"
                          type="text"
                          placeholder="Juan Dela Cruz"
                          value={formData.student_name}
                          onChange={(e) => handleInputChange('student_name', e.target.value)}
                          className={`h-11 pl-4 pr-4 rounded-lg border transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${formErrors.student_name ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200'}`}
                          autoComplete="name"
                          required
                        />
                      </div>
                      {formErrors.student_name && <p className="text-sm text-red-600">{formErrors.student_name}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Department *
                      </Label>
                      <div className="relative">
                        <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
                          <SelectTrigger id="department" name="department" aria-label="Select department" className={`h-11 pl-4 pr-4 rounded-lg border transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${formErrors.department ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200'}`}>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SAS">School of Arts and Sciences</SelectItem>
                          <SelectItem value="STCS">School of Technology and Computer Studies</SelectItem>
                          <SelectItem value="SOE">School of Engineering</SelectItem>
                          <SelectItem value="STE">School of Teacher Education</SelectItem>
                          <SelectItem value="SCJE">School of Criminal Justice Education</SelectItem>
                          <SelectItem value="SME">School of Management and Entrepreneurship</SelectItem>
                          <SelectItem value="SNHS">School of Nursing and Health Sciences</SelectItem>
                          <SelectItem value="LHS">Laboratory High School</SelectItem>
                        </SelectContent>
                      </Select>
                      </div>
                      {formErrors.department && <p className="text-sm text-red-600">{formErrors.department}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender" className="flex items-center gap-2">
                        <UserCircle2 className="h-4 w-4" />
                        Gender *
                      </Label>
                      <div className="relative">
                        <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                          <SelectTrigger id="gender" name="gender" aria-label="Select gender" className={`h-11 pl-4 pr-4 rounded-lg border transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${formErrors.gender ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200'}`}>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Male</SelectItem>
                          <SelectItem value="F">Female</SelectItem>
                        </SelectContent>
                      </Select>
                      </div>
                      {formErrors.gender && <p className="text-sm text-red-600">{formErrors.gender}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="camera_location" className="flex items-center gap-2 text-muted-foreground">
                        <AlertTriangle className="h-4 w-4" />
                        Camera Location
                      </Label>
                      <div className="relative">
                        <Input
                          id="camera_location"
                          name="camera_location"
                          value={selectedViolation.camera_location || 'N/A'}
                          disabled
                          readOnly
                          className="h-11 pl-4 pr-4 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                    </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Notes (Optional)
                    </Label>
                    <div className="relative">
                      <Textarea
                        id="notes"
                        name="notes"
                        placeholder="Add any additional observations..."
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        rows={3}
                        autoComplete="off"
                        className="min-h-[80px] pl-4 pr-4 pt-3 pb-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                      />
                    </div>
                  </div>

                  {/* Submission Progress */}
                  {isSubmitting && (
                    <div className="space-y-2">
                      <Progress value={75} className="w-full" />
                      <p className="text-sm text-muted-foreground">Submitting identification...</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                    <Button
                      variant="outline"
                      onClick={handleSaveDraft}
                      disabled={isSubmitting}
                      className="h-11 px-6 rounded-lg border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Draft
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isSubmitting}
                      className="h-11 px-6 rounded-lg border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="h-11 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all shadow-sm hover:shadow-md"
                    >
                      {isSubmitting ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <User className="h-4 w-4 mr-2" />
                          Identify Student
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* View Details Mode */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="flex items-center gap-2 text-muted-foreground">
                            <Camera className="h-4 w-4" />
                            Camera
                          </Label>
                          <p className="text-sm font-medium text-slate-900 mt-1">{selectedViolation.camera_name}</p>
                        </div>
                        <div>
                          <Label className="flex items-center gap-2 text-muted-foreground">
                            <AlertTriangle className="h-4 w-4" />
                            Location
                          </Label>
                          <p className="text-sm font-medium text-slate-900 mt-1">{selectedViolation.camera_location || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            Timestamp
                          </Label>
                          <p className="text-sm font-medium text-slate-900 mt-1">{new Date(selectedViolation.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label className="flex items-center gap-2 text-muted-foreground">
                            <BarChart3 className="h-4 w-4" />
                            Confidence
                          </Label>
                          <p className="text-sm font-medium text-slate-900 mt-1">{(selectedViolation.confidence * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <Label className="flex items-center gap-2 text-muted-foreground">
                            <AlertCircle className="h-4 w-4" />
                            Status
                          </Label>
                          <div className="mt-1">
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                              Unidentified Violation
                            </span>
                          </div>
                        </div>
                        <div>
                          <Label className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            Violation ID
                          </Label>
                          <p className="text-sm font-medium text-slate-900 mt-1 font-mono">#{selectedViolation.id}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons for View Mode */}
                  <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="h-11 px-6 rounded-lg border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => {
                        setDialogMode('identify');
                        setFormData({
                          student_id: '',
                          student_name: '',
                          department: '',
                          gender: '',
                          notes: ''
                        });
                        setFormErrors({});
                      }}
                      className="h-11 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all shadow-sm hover:shadow-md"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Identify Student
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Zoom Modal */}
      <Dialog open={imageZoomed} onOpenChange={setImageZoomed}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Violation Image</DialogTitle>
            <DialogDescription>Full size view of the violation snapshot</DialogDescription>
          </DialogHeader>
          <img 
            src={selectedViolation?.image_url || `http://localhost:8000${selectedViolation?.image}`} 
            alt="Violation Zoomed" 
            className="w-full h-auto rounded-lg" 
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Violation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this violation snapshot? This action cannot be undone and will permanently remove the violation record and its image.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteViolation}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

