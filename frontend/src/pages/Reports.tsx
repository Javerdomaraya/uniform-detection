import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, TrendingUp, TrendingDown, AlertTriangle, AlertCircle, BarChart3, Info, Download, Eye, Calendar, CalendarDays, CheckCircle, XCircle, PieChart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { useToast } from '@/hooks/use-toast';

interface Metric {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  color: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: number;
}

interface ReportStats {
  totalDetections: number;
  compliant: number;
  nonCompliant: number;
  complianceRate: number;
  totalTrend: number;
  compliantTrend: number;
  nonCompliantTrend: number;
}

export default function Reports() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState('24h');
  const [stats, setStats] = useState<ReportStats>({
    totalDetections: 0,
    compliant: 0,
    nonCompliant: 0,
    complianceRate: 0,
    totalTrend: 0,
    compliantTrend: 0,
    nonCompliantTrend: 0
  });
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [dateFilter, setDateFilter] = useState<'day' | 'week' | 'month' | 'year'>('day');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/security/stats/?range=${timeRange}`);
        const data = response.data;

        const newStats = {
          totalDetections: data.totalDetections || 0,
          compliant: data.compliant || 0,
          nonCompliant: data.nonCompliant || 0,
          complianceRate: data.complianceRate || 0,
          totalTrend: data.totalTrend || 0,
          compliantTrend: data.compliantTrend || 0,
          nonCompliantTrend: data.nonCompliantTrend || 0
        };

        setStats(newStats);

        // Create metrics from fetched data
        setMetrics([
          { 
            title: 'Total Detections', 
            value: newStats.totalDetections, 
            description: 'Students monitored today', 
            icon: <Users className="h-4 w-4 text-muted-foreground" />, 
            color: 'blue', 
            trend: 'neutral', 
            trendValue: 0 
          },
          { 
            title: 'Compliant', 
            value: newStats.compliant, 
            description: 'Following uniform policy', 
            icon: <TrendingUp className="h-4 w-4 text-green-600" />, 
            color: 'green', 
            trend: 'up', 
            trendValue: newStats.complianceRate >= 80 ? 5 : 2 
          },
          { 
            title: 'Non-Compliant', 
            value: newStats.nonCompliant, 
            description: 'Violations detected', 
            icon: <AlertTriangle className="h-4 w-4 text-red-600" />, 
            color: 'red', 
            trend: 'down', 
            trendValue: newStats.complianceRate < 70 ? 8 : 3 
          },
          { 
            title: 'Compliance Rate', 
            value: newStats.complianceRate, 
            description: 'Overall compliance', 
            icon: <BarChart3 className="h-4 w-4 text-blue-600" />, 
            color: 'blue', 
            trend: newStats.complianceRate >= 80 ? 'up' : newStats.complianceRate >= 60 ? 'neutral' : 'down', 
            trendValue: Math.abs(newStats.complianceRate - 75) 
          },
        ]);
      } catch (error) {
        console.error('Error fetching report stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [timeRange]);

  const getDateRange = (period: 'week' | 'month' | 'all') => {
    const now = new Date();
    const endDate = now.toISOString();
    let startDate: string;

    if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = weekAgo.toISOString();
    } else if (period === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = monthAgo.toISOString();
    } else {
      // All time - get from 1 year ago
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      startDate = yearAgo.toISOString();
    }

    return { startDate, endDate };
  };

  const downloadComplianceReport = async (period: 'week' | 'month' | 'all') => {
    setIsExporting(true);
    try {
      const { startDate, endDate } = getDateRange(period);
      
      // Fetch compliance data for the period
      const response = await axios.get('/api/dashboard/stats/', {
        params: {
          start_date: startDate.split('T')[0],
          end_date: endDate.split('T')[0]
        }
      });

      const data = response.data;
      const complianceRate = data.totalStudents > 0 ? ((data.compliant / data.totalStudents) * 100).toFixed(2) : '0.00';
      const complianceRateNum = parseFloat(complianceRate);

      // Create CSV content
      const periodLabel = period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'All Time';
      const csvContent = [
        ['Compliance Report - ' + periodLabel],
        ['Generated:', new Date().toLocaleString()],
        ['Period:', `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`],
        [],
        ['Metric', 'Value'],
        ['Total Detections', data.totalStudents || 0],
        ['Compliant Students', data.compliant || 0],
        ['Non-Compliant Students', data.nonCompliant || 0],
        ['Compliance Rate', `${complianceRate}%`],
        [],
        ['Status', complianceRateNum >= 80 ? 'Excellent' : complianceRateNum >= 60 ? 'Good' : 'Needs Improvement'],
      ].map(row => row.join(',')).join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `compliance_report_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `Compliance report for ${periodLabel.toLowerCase()} downloaded successfully.`,
      });
    } catch (error) {
      console.error('Error downloading compliance report:', error);
      toast({
        title: "Error",
        description: "Failed to download compliance report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const getCardGradient = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20';
      case 'green': return 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20';
      case 'red': return 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200';
      default: return 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/20 dark:to-slate-800/20';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reports</h1>
          <p className="text-slate-500">Comprehensive compliance analytics and actionable insights.</p>
        </div>
        <div className="flex gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="default"
                disabled={isExporting}
              >
                <CalendarDays className="w-4 h-4 mr-2" />
                {dateFilter === 'day' && 'Last 24 Hours'}
                {dateFilter === 'week' && 'Last 7 Days'}
                {dateFilter === 'month' && 'Last 30 Days'}
                {dateFilter === 'year' && 'Last Year'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Select Time Period</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDateFilter('day')}>
                <Calendar className="w-4 h-4 mr-2" />
                Last 24 Hours
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter('week')}>
                <Calendar className="w-4 h-4 mr-2" />
                Last 7 Days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter('month')}>
                <Calendar className="w-4 h-4 mr-2" />
                Last 30 Days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter('year')}>
                <Calendar className="w-4 h-4 mr-2" />
                Last Year
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={() => downloadComplianceReport(dateFilter)}
            disabled={isExporting}
            className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Download CSV'}
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Report Statistics</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Analytics for different time periods</p>
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

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Detections */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Detections</CardTitle>
            <div className="p-2 rounded-lg text-blue-600 bg-blue-50 dark:bg-blue-900/20">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-foreground">
                {loading ? '...' : stats.totalDetections.toLocaleString()}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Students monitored</p>
                <div className="flex items-center gap-1">
                  {stats.totalTrend > 0 ? <TrendingUp className="h-3 w-3 text-red-600" /> : stats.totalTrend < 0 ? <TrendingDown className="h-3 w-3 text-green-600" /> : null}
                  <span className="text-xs font-medium text-muted-foreground">
                    {Math.abs(stats.totalTrend)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliant */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliant</CardTitle>
            <div className="p-2 rounded-lg text-green-600 bg-green-50 dark:bg-green-900/20">
              <CheckCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-green-600">
                {loading ? '...' : stats.compliant.toLocaleString()}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Following uniform policy</p>
                <div className="flex items-center gap-1">
                  {stats.compliantTrend > 0 ? <TrendingUp className="h-3 w-3 text-green-600" /> : stats.compliantTrend < 0 ? <TrendingDown className="h-3 w-3 text-red-600" /> : null}
                  <span className="text-xs font-medium text-green-600">
                    {Math.abs(stats.compliantTrend)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Non-Compliant */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Non-Compliant</CardTitle>
            <div className="p-2 rounded-lg text-red-600 bg-red-50 dark:bg-red-900/20">
              <XCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-red-600">
                {loading ? '...' : stats.nonCompliant.toLocaleString()}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Violations detected</p>
                <div className="flex items-center gap-1">
                  {stats.nonCompliantTrend > 0 ? <TrendingUp className="h-3 w-3 text-red-600" /> : stats.nonCompliantTrend < 0 ? <TrendingDown className="h-3 w-3 text-green-600" /> : null}
                  <span className="text-xs font-medium text-red-600">
                    {Math.abs(stats.nonCompliantTrend)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Rate */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <div className="p-2 rounded-lg text-blue-600 bg-blue-50 dark:bg-blue-900/20">
              <BarChart3 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-blue-600">
                {loading ? '...' : `${stats.complianceRate.toFixed(2)}%`}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Overall compliance</p>
                <div className="flex items-center gap-1">
                  {stats.complianceRate >= 80 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-xs font-medium text-green-600">
                        {(100 - stats.complianceRate).toFixed(2)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3 w-3 text-red-600" />
                      <span className="text-xs font-medium text-red-600">
                        {(100 - stats.complianceRate).toFixed(2)}%
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis and Recommendations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Analysis */}
        <Card className="col-span-1 lg:col-span-2 border-slate-200/60 shadow-sm flex flex-col">
          <div className="flex flex-col space-y-1.5 p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-600" />
                  Compliance Analysis
                </CardTitle>
                <CardDescription>Real-time breakdown of student compliance status</CardDescription>
              </div>
              <div className="flex items-center px-3 py-1 bg-orange-50 border border-orange-100 rounded-full">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse mr-2"></span>
                <span className="text-xs font-medium text-orange-700">Live Updates</span>
              </div>
            </div>
          </div>

          <CardContent className="p-6 pt-0 flex-1 min-h-[300px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={[
                    { name: 'Compliant', value: stats.compliant, color: '#22c55e' },
                    { name: 'Non-Compliant', value: stats.nonCompliant, color: '#ef4444' }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry) => (
                    <span className="text-slate-600 font-medium ml-1">{value}</span>
                  )}
                />
              </RechartsPieChart>
            </ResponsiveContainer>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
              <span className="text-3xl font-bold text-slate-900">{stats.complianceRate}%</span>
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Compliance</span>
            </div>
          </CardContent>

          <div className="flex items-center p-6 pt-0 border-t bg-slate-50/50 p-4">
            <div className="w-full flex justify-between items-center text-sm">
              <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-1.5 rounded-md border border-orange-100">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Overall Status: {stats.complianceRate >= 80 ? "Excellent" : stats.complianceRate >= 60 ? "Good" : "Needs Improvement"}</span>
              </div>
              <div className="text-slate-500">
                Last updated: <span className="font-mono text-slate-700">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Recommendations */}
        <Card className="col-span-1 border-slate-200/60 shadow-sm flex flex-col">
          <div className="flex flex-col space-y-1.5 p-6">
            <CardTitle className="text-xl flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Recommendations
            </CardTitle>
            <CardDescription>AI-driven suggestions based on current data</CardDescription>
          </div>

          <CardContent className="p-6 pt-0 space-y-4 flex-1">
            {stats.complianceRate < 70 && (
              <div className="group p-4 bg-amber-50/50 border border-amber-200/60 rounded-xl hover:shadow-sm transition-all duration-300 hover:border-amber-300">
                <div className="flex gap-3">
                  <div className="mt-0.5 p-1.5 bg-amber-100 rounded-lg text-amber-600">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-amber-900 mb-1">Low Compliance Alert</h4>
                    <p className="text-sm text-amber-800/80 leading-relaxed">Consider implementing additional awareness campaigns or stricter enforcement measures for repeat offenders.</p>
                  </div>
                </div>
              </div>
            )}
            {stats.nonCompliant > stats.compliant && (
              <div className="group p-4 bg-red-50/50 border border-red-200/60 rounded-xl hover:shadow-sm transition-all duration-300 hover:border-red-300">
                <div className="flex gap-3">
                  <div className="mt-0.5 p-1.5 bg-red-100 rounded-lg text-red-600">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-red-900 mb-1">High Violation Rate</h4>
                    <p className="text-sm text-red-800/80 leading-relaxed">Review camera placement and consider additional monitoring points for better coverage.</p>
                  </div>
                </div>
              </div>
            )}
            {stats.complianceRate >= 90 && (
              <div className="group p-4 bg-green-50/50 border border-green-200/60 rounded-xl hover:shadow-sm transition-all duration-300 hover:border-green-300">
                <div className="flex gap-3">
                  <div className="mt-0.5 p-1.5 bg-green-100 rounded-lg text-green-600">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-green-900 mb-1">Excellent Performance</h4>
                    <p className="text-sm text-green-800/80 leading-relaxed">Continue current policies and consider sharing best practices with other institutions.</p>
                  </div>
                </div>
              </div>
            )}
            <div className="group p-4 bg-blue-50/50 border border-blue-200/60 rounded-xl hover:shadow-sm transition-all duration-300 hover:border-blue-300">
              <div className="flex gap-3">
                <div className="mt-0.5 p-1.5 bg-blue-100 rounded-lg text-blue-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">Regular Monitoring</h4>
                  <p className="text-sm text-blue-800/80 leading-relaxed">Schedule weekly reviews of compliance data to identify emerging negative trends early.</p>
                </div>
              </div>
            </div>
          </CardContent>

          <div className="flex items-center p-6 pt-0 p-6 pt-2 grid grid-cols-2 gap-3">
            <Button variant="outline" className="w-full">
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
            <Button variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}