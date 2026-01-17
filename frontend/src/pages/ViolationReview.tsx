import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertTriangle, CheckCircle, Clock, User, Building2, RefreshCw, FileText, Download, Eye, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';

interface RepeatOffender {
  student_name: string;
  department: string;
  gender: string;
  violation_count: number;
  latest_violation: string;
}

interface Violation {
  id: number;
  image: string;
  image_url?: string;
  timestamp: string;
  camera_name: string;
  camera_location: string;
  student_id: string;
  student_name: string;
  department: string;
  department_display: string;
  gender: string;
  notes: string;
  admin_notes?: string;
  violation_count: number;
  reviewed: boolean;
  sent_to_admin: boolean;
  confidence: number;
}

export default function ViolationReview() {
  const [repeatOffenders, setRepeatOffenders] = useState<RepeatOffender[]>([]);
  const [pendingReview, setPendingReview] = useState<Violation[]>([]);
  const [pendingIdentification, setPendingIdentification] = useState<Violation[]>([]);
  const [recentlyReviewed, setRecentlyReviewed] = useState<Violation[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentViolations, setStudentViolations] = useState<Violation[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [expandedViolation, setExpandedViolation] = useState<number | null>(null);
  const [reportPeriod, setReportPeriod] = useState<'day' | 'month' | 'year'>('month');
  const { toast } = useToast();

  useEffect(() => {
    fetchViolationsForReview();
    
    // Auto-refresh every 30 seconds to sync with Security Personnel deletions
    const interval = setInterval(() => {
      fetchViolationsForReview();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchViolationsForReview = async (showToast = false) => {
    setRefreshing(true);
    try {
      const response = await axios.get('http://localhost:8000/api/violations/review/');
      setRepeatOffenders(response.data.repeat_offenders || []);
      setPendingReview(response.data.pending_review || []);
      setPendingIdentification(response.data.pending_identification || []);
      setRecentlyReviewed(response.data.recently_reviewed || []);
      
      if (showToast) {
        toast({
          title: "Refreshed",
          description: "Violation data updated successfully",
        });
      }
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

  const handleViewStudent = async (studentName: string) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/violations/student-history/?student_name=${studentName}`);
      setStudentViolations(response.data.violations || []);
      setSelectedStudent(studentName);
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Error fetching student history:', error);
      toast({
        title: "Error",
        description: "Failed to load student history",
        variant: "destructive"
      });
    }
  };

  const handleReviewAll = async () => {
    if (!selectedStudent) return;

    setLoading(true);
    try {
      // Review all unreviewed violations for this student
      const unreviewedIds = studentViolations.filter(v => !v.reviewed).map(v => v.id);
      
      for (const violationId of unreviewedIds) {
        await axios.post(`http://localhost:8000/api/violations/${violationId}/review/`, {
          notes: reviewNotes
        });
      }

      toast({
        title: "Violations Reviewed",
        description: `All violations for ${selectedStudent} have been marked as reviewed`
      });

      setIsDialogOpen(false);
      setReviewNotes('');
      fetchViolationsForReview();
    } catch (error) {
      console.error('Error reviewing violations:', error);
      toast({
        title: "Error",
        description: "Failed to review violations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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

  // Helper functions for status display
  const getStatusIcon = (reviewed: boolean, sentToAdmin: boolean) => {
    if (reviewed) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (sentToAdmin) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    return <Clock className="h-4 w-4 text-yellow-600" />;
  };

  const getStatusColor = (reviewed: boolean, sentToAdmin: boolean) => {
    if (reviewed) return 'bg-green-600 text-white border-green-600';
    if (sentToAdmin) return 'bg-red-600 text-white border-red-600';
    return 'bg-yellow-600 text-white border-yellow-600';
  };

  const getStatusText = (reviewed: boolean, sentToAdmin: boolean) => {
    if (reviewed) return 'Reviewed';
    if (sentToAdmin) return 'Flagged';
    return 'Pending';
  };

  // Filter violations by time period
  const filterViolationsByPeriod = (violations: any[]) => {
    const now = new Date();
    let startDate: Date;

    switch (reportPeriod) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return violations;
    }

    return violations.filter(violation => {
      const violationDate = new Date(violation.timestamp || violation.latest_violation);
      return violationDate >= startDate;
    });
  };

  // Download identified violations to CSV
  const downloadViolationsCSV = () => {
    try {
      const headers = ['Student ID', 'Student Name', 'Department', 'Gender', 'Camera', 'Date & Time', 'Confidence', 'Status', 'Notes'];
      const rows: string[][] = [];

      // Only include violations that have been REVIEWED (not pending)
      const reviewedViolations = [
        ...pendingReview.filter(violation => violation.reviewed === true),
        ...recentlyReviewed.filter(violation => violation.reviewed === true)
      ];

      // Filter by selected time period
      const filteredViolations = filterViolationsByPeriod(reviewedViolations);

      // Add reviewed violations to rows
      filteredViolations.forEach((violation) => {
        rows.push([
          violation.student_id || 'N/A',
          violation.student_name || 'N/A',
          violation.department_display || getDepartmentName(violation.department) || 'N/A',
          violation.gender === 'M' ? 'Male' : violation.gender === 'F' ? 'Female' : 'N/A',
          violation.camera_name || 'N/A',
          new Date(violation.timestamp).toLocaleString(),
          `${Math.round(violation.confidence * 100)}%`,
          'Reviewed',
          violation.admin_notes || 'N/A'
        ]);
      });

      if (rows.length === 0) {
        toast({
          title: "No Reviewed Violations",
          description: `No reviewed violations found for the selected ${reportPeriod} period. Please review violations first.`,
          variant: "destructive"
        });
        return;
      }

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `identified_violations_report_${reportPeriod}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `${rows.length} identified violations exported for ${reportPeriod} period`,
      });
    } catch (error) {
      console.error('Error downloading CSV:', error);
      toast({
        title: "Error",
        description: "Failed to download report",
        variant: "destructive"
      });
    }
  };

  const downloadPDFReport = async (period: 'day' | 'month' | 'year') => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/management/violations/download_pdf_report/?period=${period}`, {
        responseType: 'blob'
      });

      // Create a blob from the PDF data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `violation_report_${period}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `PDF report downloaded successfully for ${period} period`,
      });
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      
      let errorMessage = "Failed to download PDF report";
      if (error.response?.status === 404) {
        errorMessage = `No reviewed violations found for the selected ${period} period`;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Violation Review Center</h1>
          <p className="text-muted-foreground">Review and manage student uniform violations</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={loading}>
                <Download className="h-4 w-4 mr-2" />
                Download Report
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">PDF Report</div>
              <DropdownMenuItem onClick={() => downloadPDFReport('day')}>
                <FileText className="h-4 w-4 mr-2" />
                This Day (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadPDFReport('month')}>
                <FileText className="h-4 w-4 mr-2" />
                This Month (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadPDFReport('year')}>
                <FileText className="h-4 w-4 mr-2" />
                This Year (PDF)
              </DropdownMenuItem>
              <div className="my-1 h-px bg-border" />
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">CSV Report</div>
              <DropdownMenuItem onClick={() => { setReportPeriod('day'); downloadViolationsCSV(); }}>
                <Download className="h-4 w-4 mr-2" />
                This Day (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setReportPeriod('month'); downloadViolationsCSV(); }}>
                <Download className="h-4 w-4 mr-2" />
                This Month (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setReportPeriod('year'); downloadViolationsCSV(); }}>
                <Download className="h-4 w-4 mr-2" />
                This Year (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => fetchViolationsForReview(true)} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="repeat-offenders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="repeat-offenders" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Repeat Offenders ({repeatOffenders.length})
          </TabsTrigger>
          <TabsTrigger value="pending-review" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Pending Review ({pendingReview.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Identification ({pendingIdentification.length})
          </TabsTrigger>
          <TabsTrigger value="reviewed" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Recently Reviewed ({recentlyReviewed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="repeat-offenders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                Students with 3+ Violations
              </CardTitle>
              <CardDescription>
                These students require immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {repeatOffenders.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <p className="text-muted-foreground">No repeat offenders at this time</p>
                  <p className="text-sm text-muted-foreground mt-2">All students are in good standing</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {repeatOffenders.map((offender, index) => (
                    <Card key={index} className="border-orange-200 bg-orange-50/50">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <User className="h-5 w-5 text-orange-600" />
                              <h3 className="font-semibold text-lg">{offender.student_name}</h3>
                              <Badge variant="destructive">{offender.violation_count} Violations</Badge>
                            </div>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Building2 className="h-4 w-4" />
                                {getDepartmentName(offender.department)}
                              </div>
                              <div>
                                Gender: {offender.gender === 'M' ? 'Male' : 'Female'}
                              </div>
                              <div>
                                Latest: {new Date(offender.latest_violation).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <Button onClick={() => handleViewStudent(offender.student_name)}>
                            Review Violations
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending-review">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Violations Pending Admin Review
              </CardTitle>
              <CardDescription>
                Students identified by Security Personnel awaiting your review
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingReview.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <p className="text-muted-foreground">No violations pending review</p>
                  <p className="text-sm text-muted-foreground mt-2">All identified violations have been reviewed</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingReview.map((violation) => (
                    <Card key={violation.id} className="border-blue-200 bg-blue-50/30">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <img 
                            src={violation.image_url || `http://localhost:8000${violation.image}`} 
                            alt="Violation" 
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{violation.student_name}</h3>
                              {violation.sent_to_admin && (
                                <Badge variant="destructive" className="text-xs">Flagged</Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {violation.department_display}
                              </div>
                              <div>Gender: {violation.gender === 'M' ? 'Male' : 'Female'}</div>
                              <div className="col-span-2">{violation.camera_name} - {violation.camera_location}</div>
                              <div className="col-span-2 text-xs">{new Date(violation.timestamp).toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            <Badge variant="outline" className="text-xs">
                              {violation.violation_count || 1} violation{(violation.violation_count || 1) > 1 ? 's' : ''}
                            </Badge>
                            <Button 
                              size="sm"
                              onClick={() => handleViewStudent(violation.student_name)}
                            >
                              Review
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Awaiting Student Identification</CardTitle>
              <CardDescription>
                Security personnel need to identify these students
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingIdentification.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <p className="text-muted-foreground">All violations have been identified</p>
                  <p className="text-sm text-muted-foreground mt-2">No pending identifications</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingIdentification.map((violation) => (
                    <Card key={violation.id}>
                      <CardContent className="p-4">
                        <img 
                          src={violation.image_url || `http://localhost:8000${violation.image}`} 
                          alt="Violation" 
                          className="w-full h-48 object-cover rounded-lg mb-3"
                        />
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Badge variant="secondary">Pending ID</Badge>
                            <Badge variant="outline">{(violation.confidence * 100).toFixed(0)}%</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div className="font-medium">{violation.camera_name || 'Unknown Camera'}</div>
                            <div className="text-xs">{violation.camera_location || 'Unknown Location'}</div>
                            <div className="text-xs">{new Date(violation.timestamp).toLocaleString()}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviewed">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Recently Reviewed Violations
              </CardTitle>
              <CardDescription>
                Violations reviewed in the last 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentlyReviewed.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No recently reviewed violations</p>
                  <p className="text-sm text-muted-foreground mt-2">Completed reviews will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentlyReviewed.map((violation) => (
                    <Card key={violation.id} className="border-green-200 bg-green-50/50">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <img 
                            src={violation.image_url || `http://localhost:8000${violation.image}`} 
                            alt="Violation" 
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h4 className="font-semibold">{violation.student_name}</h4>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div>{violation.department_display} • {violation.gender === 'M' ? 'Male' : 'Female'}</div>
                              <div>{violation.camera_name || 'Unknown Camera'}</div>
                              <div className="text-xs">{new Date(violation.timestamp).toLocaleString()}</div>
                              {violation.notes && <div className="italic text-xs">"{violation.notes}"</div>}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-green-600 border-green-600 h-fit">
                            Reviewed
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Student Violation History Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-50">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-2xl font-bold text-gray-800">
              Review Violations for {selectedStudent}
            </DialogTitle>
            <DialogDescription className="text-base">
              {studentViolations.length} total violation{studentViolations.length !== 1 ? 's' : ''} recorded
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studentViolations.map((violation) => (
                <div key={violation.id} className="space-y-3">
                  <div className="relative group">
                    <img 
                      src={violation.image_url || `http://localhost:8000${violation.image}`} 
                      alt="Violation" 
                      className="w-full h-56 object-cover rounded-lg shadow-md transition-transform group-hover:scale-105 cursor-pointer"
                      onClick={() => setSelectedImage(violation.image_url || `http://localhost:8000${violation.image}`)}
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 rounded-lg flex items-center justify-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white hover:bg-gray-100"
                              onClick={() => setSelectedImage(violation.image_url || `http://localhost:8000${violation.image}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Click to zoom image</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    {/* Status badge */}
                    <div className="absolute top-3 right-3">
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-1 shadow-md ${getStatusColor(violation.reviewed, violation.sent_to_admin)}`}
                      >
                        {getStatusIcon(violation.reviewed, violation.sent_to_admin)}
                        {getStatusText(violation.reviewed, violation.sent_to_admin)}
                      </Badge>
                    </div>
                  </div>

                  {/* Collapsible details */}
                  <Collapsible open={expandedViolation === violation.id} onOpenChange={() => setExpandedViolation(expandedViolation === violation.id ? null : violation.id)}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full text-xs text-blue-600 hover:text-blue-800">
                        {expandedViolation === violation.id ? 'Hide Details' : 'Show Details'}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-1 text-xs text-muted-foreground bg-white p-3 rounded-lg shadow-sm border">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span className="font-medium">{new Date(violation.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        <span>{violation.camera_name}</span>
                      </div>
                      <div className="pl-5 text-gray-600">{violation.camera_location}</div>
                      {violation.admin_notes && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="font-medium text-gray-700">Admin Notes:</div>
                          <div className="text-gray-600 italic">{violation.admin_notes}</div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))}
            </div>

            <div className="space-y-2 bg-white p-4 rounded-lg shadow-sm border">
              <label htmlFor="admin-review-notes" className="text-sm font-medium text-gray-700">Admin Review Notes</label>
              <Textarea
                id="admin-review-notes"
                name="adminReviewNotes"
                placeholder="Add notes about this review (e.g., warning issued, meeting scheduled, disciplinary action...)..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleReviewAll} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {loading ? 'Reviewing...' : 'Mark All as Reviewed'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Mark all violations as reviewed and save notes</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={() => {
                      // Only export violations that are marked as reviewed
                      const reviewedViolations = studentViolations.filter(v => v.reviewed);
                      
                      if (reviewedViolations.length === 0) {
                        toast({
                          title: "No Reviewed Violations",
                          description: "Please mark violations as reviewed first before exporting.",
                          variant: "destructive"
                        });
                        return;
                      }

                      const violationData = reviewedViolations.map(v => ({
                        student_id: v.student_id || 'N/A',
                        student_name: v.student_name || selectedStudent || 'N/A',
                        department: v.department_display || v.department || 'N/A',
                        timestamp: new Date(v.timestamp).toLocaleString(),
                        camera: v.camera_name || 'Unknown Camera',
                        location: v.camera_location || 'Unknown Location',
                        confidence: `${Math.round(v.confidence * 100)}%`,
                        status: getStatusText(v.reviewed, v.sent_to_admin),
                        notes: v.admin_notes || 'N/A'
                      }));
                      
                      const csvContent = [
                        ['Student ID', 'Student Name', 'Department', 'Timestamp', 'Camera', 'Location', 'Confidence', 'Status', 'Notes'].join(','),
                        ...violationData.map(v => [v.student_id, v.student_name, v.department, v.timestamp, v.camera, v.location, v.confidence, v.status, v.notes].map(cell => `"${cell}"`).join(','))
                      ].join('\n');
                      
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      const studentId = reviewedViolations[0]?.student_id || 'unknown';
                      a.download = `violation_report_${studentId}_${new Date().toISOString().slice(0, 10)}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                      
                      toast({
                        title: "Report Downloaded",
                        description: `Successfully exported ${reviewedViolations.length} reviewed violation(s) for ${selectedStudent}`,
                      });
                    }}>
                      <FileText className="h-4 w-4 mr-2" />
                      Export Report
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download reviewed violations as CSV</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Zoom Modal */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Violation Image</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center">
              <img 
                src={selectedImage} 
                alt="Violation Zoom" 
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
