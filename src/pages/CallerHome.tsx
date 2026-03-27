import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, Clock, Award, Calendar, Users, BarChart3, CheckCircle, Phone, MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Lead {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  locationUrl: string;
  city: string;
  category: string;
  notes: string;
  status: string;
  callerNote: string;
  createdAt: any;
  updatedAt: any;
}

const CallerHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [todayStats, setTodayStats] = useState({ callsMade: 0, hoursWorked: 0, interestedCount: 0, rejectedCount: 0, target: 100 });
  const [weeklyStats, setWeeklyStats] = useState({ callsMade: 0, interestedCount: 0, rejectedCount: 0, daysWorked: 0 });
  const [isWorking, setIsWorking] = useState(false);

  const DAILY_TARGET = 100;

  useEffect(() => {
    if (!user) return;

    // Fetch all leads data from Firestore
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const leadsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
      
      // Calculate today's call statistics
      const today = new Date().toDateString();
      let callsMade = 0;
      let interestedCount = 0;
      let rejectedCount = 0;
      
      leadsData.forEach(lead => {
        const leadDate = lead.updatedAt?.toDate ? lead.updatedAt.toDate() : new Date(lead.updatedAt);
        if (leadDate.toDateString() === today && (lead.status === 'interested' || lead.status === 'rejected')) {
          callsMade++;
          if (lead.status === 'interested') interestedCount++;
          if (lead.status === 'rejected') rejectedCount++;
        }
      });
      
      // Get work hours from localStorage
      const todayStatsData = localStorage.getItem(`workStats_${user?.uid}_${today}`);
      let hoursWorked = 0;
      let working = false;
      
      if (todayStatsData) {
        const stats = JSON.parse(todayStatsData);
        hoursWorked = stats.hoursWorked || 0;
        working = stats.startTime && !stats.endTime;
      }
      
      setTodayStats({ callsMade, hoursWorked, interestedCount, rejectedCount, target: DAILY_TARGET });
      setIsWorking(working);
      
      // Calculate weekly stats (Sunday to Saturday)
      let weeklyCallsMade = 0;
      let weeklyInterested = 0;
      let weeklyRejected = 0;
      let daysWorked = 0;
      
      const todayDate = new Date();
      const currentDay = todayDate.getDay(); // 0 = Sunday, 6 = Saturday
      const sunday = new Date(todayDate);
      sunday.setDate(todayDate.getDate() - currentDay); // Go back to Sunday
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(sunday);
        date.setDate(sunday.getDate() + i);
        const dateKey = date.toDateString();
        
        let dayCalls = 0;
        leadsData.forEach(lead => {
          const leadDate = lead.updatedAt?.toDate ? lead.updatedAt.toDate() : new Date(lead.updatedAt);
          if (leadDate.toDateString() === dateKey && (lead.status === 'interested' || lead.status === 'rejected')) {
            dayCalls++;
            if (leadDate.toDateString() === dateKey) {
              if (lead.status === 'interested') weeklyInterested++;
              if (lead.status === 'rejected') weeklyRejected++;
            }
          }
        });
        
        if (dayCalls > 0) {
          weeklyCallsMade += dayCalls;
          daysWorked++;
        }
      }
      
      setWeeklyStats({ callsMade: weeklyCallsMade, interestedCount: weeklyInterested, rejectedCount: weeklyRejected, daysWorked });
    });
    
    return unsub;
  }, [user]);

  const progressPercentage = Math.min((todayStats.callsMade / todayStats.target) * 100, 100);
  const remainingCalls = Math.max(todayStats.target - todayStats.callsMade, 0);
  const efficiency = todayStats.hoursWorked > 0 ? (todayStats.callsMade / todayStats.hoursWorked).toFixed(1) : '0';
  const conversionRate = todayStats.callsMade > 0 ? ((todayStats.interestedCount / todayStats.callsMade) * 100).toFixed(1) : '0';

  const getProgressColor = () => {
    if (progressPercentage >= 100) return "text-green-600";
    if (progressPercentage >= 75) return "text-yellow-600";
    if (progressPercentage >= 50) return "text-blue-600";
    return "text-red-600";
  };

  const getStatusBadge = () => {
    if (isWorking) {
      return <Badge className="bg-green-100 text-green-800 border-green-200"><Clock className="w-3 h-3 mr-1" />On Call</Badge>;
    } else if (todayStats.callsMade > 0) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><CheckCircle className="w-3 h-3 mr-1" />Active Today</Badge>;
    } else {
      return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Ready to Start</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Caller Dashboard</h1>
            <p className="text-muted-foreground">Track your calling performance and lead conversions</p>
          </div>
          <div className="flex items-center gap-4">
            {getStatusBadge()}
            <Button onClick={() => navigate("/caller")} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Phone className="w-4 h-4 mr-2" />Start Calling
            </Button>
          </div>
        </div>

        {/* Today's Performance */}
        <Card className="border-accent/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-accent" />
              Today's Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Daily Target</h3>
                <div className="text-3xl font-bold text-accent">{todayStats.target}</div>
                <p className="text-sm text-muted-foreground">Calls</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Calls Made</h3>
                <div className="text-3xl font-bold text-accent">{todayStats.callsMade}</div>
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Interested</h3>
                <div className="text-3xl font-bold text-green-600">{todayStats.interestedCount}</div>
                <p className="text-sm text-muted-foreground">Positive</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Rejected</h3>
                <div className="text-3xl font-bold text-red-600">{todayStats.rejectedCount}</div>
                <p className="text-sm text-muted-foreground">Not interested</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Conversion</h3>
                <div className="text-3xl font-bold text-purple-600">{conversionRate}%</div>
                <p className="text-sm text-muted-foreground">Rate</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Daily Progress</span>
                <span className={`text-sm font-medium ${getProgressColor()}`}>
                  {progressPercentage.toFixed(1)}% Complete
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div 
                  className="bg-accent h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {remainingCalls > 0 ? `${remainingCalls} calls remaining` : 'Daily target achieved!'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-accent" />
              Weekly Overview (Sunday - Saturday)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Total Calls</h3>
                <div className="text-3xl font-bold text-accent">{weeklyStats.callsMade}</div>
                <p className="text-sm text-muted-foreground">This week</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Interested</h3>
                <div className="text-3xl font-bold text-green-600">{weeklyStats.interestedCount}</div>
                <p className="text-sm text-muted-foreground">Positive responses</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Rejected</h3>
                <div className="text-3xl font-bold text-red-600">{weeklyStats.rejectedCount}</div>
                <p className="text-sm text-muted-foreground">Not interested</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Days Active</h3>
                <div className="text-3xl font-bold text-blue-600">{weeklyStats.daysWorked}</div>
                <p className="text-sm text-muted-foreground">Calling days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-accent/20" onClick={() => navigate("/caller")}>
            <CardContent className="p-6 text-center">
              <Phone className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Start Calling</h3>
              <p className="text-sm text-muted-foreground">Begin making calls to leads</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-accent/20" onClick={() => navigate("/performance")}>
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Performance</h3>
              <p className="text-sm text-muted-foreground">View detailed calling analytics</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-accent/20">
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Call Notes</h3>
              <p className="text-sm text-muted-foreground">Review previous call notes</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Insights */}
        <Card className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Performance Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Call Efficiency</h4>
                <p className="text-2xl font-bold text-accent mb-1">{efficiency}</p>
                <p className="text-sm text-muted-foreground">Calls per hour today</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Conversion Rate</h4>
                <p className="text-2xl font-bold text-green-600 mb-1">{conversionRate}%</p>
                <p className="text-sm text-muted-foreground">Interested leads today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Motivational Message */}
        <Card className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">Keep Making Those Calls! 📞</h3>
            <p className="text-muted-foreground">
              {progressPercentage >= 100 
                ? "Amazing work! You've hit your daily target!"
                : progressPercentage >= 75
                ? "You're doing great! Just a few more calls to reach your goal!"
                : progressPercentage >= 50
                ? "Good momentum! Keep up the consistent calling!"
                : "Time to start dialing! Every call is an opportunity!"}
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CallerHome;
