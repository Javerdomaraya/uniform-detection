import { Button } from '../components/ui/button';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

import { AlertTriangle } from 'lucide-react';

import { useNavigate } from 'react-router-dom';



export default function Unauthorized() {

  const navigate = useNavigate();



  return (

    <div className="min-h-screen flex items-center justify-center bg-background">

      <Card className="w-full max-w-md">

        <CardHeader className="text-center">

          <div className="flex justify-center mb-4">

            <div className="bg-destructive/10 rounded-full p-3">

              <AlertTriangle className="h-8 w-8 text-destructive" />

            </div>

          </div>

          <CardTitle className="text-2xl">Access Denied</CardTitle>

          <CardDescription>

            You don't have permission to access this page.

          </CardDescription>

        </CardHeader>

        <CardContent className="text-center">

          <Button onClick={() => navigate(-1)} variant="outline">

            Go Back

          </Button>

        </CardContent>

      </Card>

    </div>

  );

}