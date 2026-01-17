import { useState, useEffect } from 'react';
import { 
  Shield, 
  Camera, 
  Users,
  CheckCircle,
  Monitor,
  FileText,
  Lock,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function About() {
  const [animatedCounters, setAnimatedCounters] = useState({ detections: 0, compliance: 0, violations: 0 });

  useEffect(() => {
    // Animate counters on load
    const interval = setInterval(() => {
      setAnimatedCounters(prev => ({
        detections: Math.min(prev.detections + 10, 1500),
        compliance: Math.min(prev.compliance + 1, 85),
        violations: Math.min(prev.violations + 1, 15),
      }));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const features = [
    { 
      icon: Camera, 
      title: 'Real-time Detection', 
      desc: 'AI-powered uniform compliance detection using live camera feeds at the main gate.', 
      color: 'text-blue-600' 
    },
    { 
      icon: Shield, 
      title: 'Security Monitoring', 
      desc: 'Dedicated dashboard for security personnel to monitor compliance and receive alerts.', 
      color: 'text-green-600' 
    },
    { 
      icon: Users, 
      title: 'User Management', 
      desc: 'Administrator tools for managing security personnel and system settings.', 
      color: 'text-purple-600' 
    },
    { 
      icon: FileText, 
      title: 'Compliance Reports', 
      desc: 'Detailed analytics and exportable reports on uniform compliance statistics.', 
      color: 'text-orange-600' 
    },
    { 
      icon: Lock, 
      title: 'Data Privacy', 
      desc: 'Privacy-focused design with temporary image processing and secure log storage.', 
      color: 'text-red-600' 
    },
    { 
      icon: Monitor, 
      title: 'Live Dashboard', 
      desc: 'Real-time monitoring interface with instant alerts and compliance tracking.', 
      color: 'text-indigo-600' 
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center space-y-6 animate-fade-in">
        <div className="flex justify-center mb-6">
          <img 
            src="/Bipsu_new.png" 
            alt="BiPSU Logo" 
            className="h-32 w-32 object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300"
          />
        </div>
        <h1 className="text-5xl font-bold text-foreground bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Biliran Province State University
        </h1>
        <h2 className="text-3xl font-semibold text-primary">Uniform Compliance Detection System</h2>
        <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
          Advanced AI-powered system for real-time monitoring and detection of student uniform compliance at the university's main gate, ensuring adherence to dress code policies while maintaining data privacy.
        </p>
      </div>

      {/* System Overview */}
      <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300 bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Shield className="h-6 w-6 text-primary" />
            System Overview
          </CardTitle>
          <CardDescription>Comprehensive uniform compliance monitoring solution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold mb-3 text-lg">Target Users</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Security Personnel - Live monitoring and alert management
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Administrators - System management and reporting
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-lg">Detection Capabilities</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  Prescribed uniform verification
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  Student ID presence detection
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  Real-time compliance classification
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Features */}
      <div>
        <h3 className="text-3xl font-bold text-foreground mb-8 text-center">Key Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <TooltipProvider key={index}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="hover:scale-105 transition-transform duration-300 cursor-pointer shadow-lg hover:shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <feature.icon className={`h-6 w-6 ${feature.color}`} />
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{feature.desc}</p>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Click to learn more about {feature.title}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      {/* Technical Specifications */}
      <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Monitor className="h-6 w-6 text-primary" />
            Technical Specifications
          </CardTitle>
          <CardDescription>System architecture and deployment details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3 text-lg">Video Integration</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• 2 IP cameras at main gate</li>
                  <li>• Live video feed processing</li>
                  <li>• Real-time AI detection</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-lg">Data Privacy</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• No permanent image storage</li>
                  <li>• Log-only data retention</li>
                  <li>• Privacy-compliant design</li>
                </ul>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3 text-lg">Deployment</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Local university server</li>
                  <li>• LAN/Intranet based</li>
                  <li>• No cloud dependency</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-lg">Security</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Role-based authentication</li>
                  <li>• Secure user management</li>
                  <li>• Local login system</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <CheckCircle className="h-6 w-6 text-green-600" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
              <span className="text-sm font-medium">Detection System</span>
              <Badge className="bg-green-100 text-green-800 border-green-200 animate-pulse">Online</Badge>
            </div>
            <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
              <span className="text-sm font-medium">Camera Feed</span>
              <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
              <span className="text-sm font-medium">Database</span>
              <Badge className="bg-green-100 text-green-800 border-green-200">Connected</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Section */}
      <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Mail className="h-6 w-6 text-primary" />
            Contact Us
          </CardTitle>
          <CardDescription>Get in touch with our support team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <span>Biliran Province State University, Philippines</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <span>+63 (XXX) XXX-XXXX</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <span>support@bpsu.edu.ph</span>
              </div>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full md:w-auto">Send Feedback</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Feedback</DialogTitle>
                  <DialogDescription>Help us improve the system</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Your Name" />
                  <Input placeholder="Your Email" />
                  <Textarea placeholder="Your feedback..." rows={4} />
                  <Button className="w-full">Submit</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center py-8 border-t border-border">
        <p className="text-sm text-muted-foreground">© 2024 Biliran Province State University. All rights reserved.</p>
        <p className="text-xs text-muted-foreground mt-2">Uniform Compliance Detection System v1.0</p>
      </div>
    </div>
  );
}