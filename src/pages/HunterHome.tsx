import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, Clock, Award, Calendar, Users, BarChart3, CheckCircle, Building2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
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
  createdAt: any;
}

const HunterHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [todayStats, setTodayStats] = useState({ leadsAdded: 0, hoursWorked: 0, target: 300 });
  const [weeklyStats, setWeeklyStats] = useState({ leadsAdded: 0, hoursWorked: 0, daysWorked: 0 });
  const [isWorking, setIsWorking] = useState(false);

  const DAILY_TARGET = 300;

  useEffect(() => {
    if (!user) return;

    // Fetch actual leads data from Firestore
    const q = query(
      collection(db, "leads"),
      where("addedBy", "==", user.uid)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const leadsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
      
      // Calculate actual stats from leads data
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      
      const today = todayDate.toDateString();
      let todayLeadsCount = 0;
      
      // Get weekly stats (Sunday to Saturday)
      let totalLeads = 0;
      let totalHours = 0;
      let daysWorked = 0;
      
      const currentDay = todayDate.getDay(); // 0 = Sunday, 6 = Saturday
      const sunday = new Date(todayDate);
      sunday.setDate(todayDate.getDate() - currentDay); // Go back to Sunday
      
      // Calculate leads from actual data
      leadsData.forEach(lead => {
        const leadDate = lead.createdAt?.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt);
        const leadDateString = leadDate.toDateString();
        
        // Count today's leads
        if (leadDateString === today) {
          todayLeadsCount++;
        }
        
        // Count weekly leads (Sunday to Saturday)
        for (let i = 0; i < 7; i++) {
          const weekDate = new Date(sunday);
          weekDate.setDate(sunday.getDate() + i);
          if (weekDate.toDateString() === leadDateString) {
            totalLeads++;
            break;
          }
        }
      });
      
      // Get work hours from localStorage (since leads don't track hours)
      for (let i = 0; i < 7; i++) {
        const date = new Date(sunday);
        date.setDate(sunday.getDate() + i);
        const dateKey = date.toDateString();
        const savedStats = localStorage.getItem(`workStats_${user.uid}_${dateKey}`);
        
        if (savedStats) {
          const stats = JSON.parse(savedStats);
          totalHours += stats.hoursWorked || 0;
          if (stats.hoursWorked > 0) daysWorked++;
        }
      }
      
      // Update today's stats with actual lead count
      const todayStatsData = localStorage.getItem(`workStats_${user.uid}_${today}`);
      let hoursWorked = 0;
      let working = false;
      
      if (todayStatsData) {
        const stats = JSON.parse(todayStatsData);
        hoursWorked = stats.hoursWorked || 0;
        working = stats.startTime && !stats.endTime;
        
        // Update localStorage with correct lead count
        const updatedStats = { ...stats, leadsAdded: todayLeadsCount };
        localStorage.setItem(`workStats_${user.uid}_${today}`, JSON.stringify(updatedStats));
      } else {
        // Create new stats entry for today
        const newStats = { leadsAdded: todayLeadsCount, hoursWorked: 0 };
        localStorage.setItem(`workStats_${user.uid}_${today}`, JSON.stringify(newStats));
      }
      
      setTodayStats({
        leadsAdded: todayLeadsCount,
        hoursWorked: hoursWorked,
        target: DAILY_TARGET
      });
      setIsWorking(working);
      setWeeklyStats({ leadsAdded: totalLeads, hoursWorked: totalHours, daysWorked });
    });
    
    return unsub;
  }, [user]);

  const progressPercentage = Math.min((todayStats.leadsAdded / todayStats.target) * 100, 100);
  const remainingLeads = Math.max(todayStats.target - todayStats.leadsAdded, 0);
  const efficiency = todayStats.hoursWorked > 0 ? (todayStats.leadsAdded / todayStats.hoursWorked).toFixed(1) : '0';

  const getProgressColor = () => {
    if (progressPercentage >= 100) return "text-green-600";
    if (progressPercentage >= 75) return "text-yellow-600";
    if (progressPercentage >= 50) return "text-blue-600";
    return "text-red-600";
  };

  const getStatusBadge = () => {
    if (isWorking) {
      return <Badge className="bg-green-100 text-green-800 border-green-200"><Clock className="w-3 h-3 mr-1" />Working</Badge>;
    } else if (todayStats.hoursWorked > 0) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
    } else {
      return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Not Started</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Hunter Dashboard</h1>
            <p className="text-muted-foreground">Track your lead generation performance</p>
          </div>
          <div className="flex items-center gap-4">
            {getStatusBadge()}
            <Button onClick={() => navigate("/hunter")} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="w-4 h-4 mr-2" />Add Lead
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Daily Target</h3>
                <div className="text-3xl font-bold text-accent">{todayStats.target}</div>
                <p className="text-sm text-muted-foreground">Leads</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Leads Added</h3>
                <div className="text-3xl font-bold text-accent">{todayStats.leadsAdded}</div>
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Remaining</h3>
                <div className="text-3xl font-bold text-orange-600">{remainingLeads}</div>
                <p className="text-sm text-muted-foreground">To reach target</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Efficiency</h3>
                <div className="text-3xl font-bold text-purple-600">{efficiency}</div>
                <p className="text-sm text-muted-foreground">Leads per hour</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Total Leads</h3>
                <div className="text-3xl font-bold text-accent">{weeklyStats.leadsAdded}</div>
                <p className="text-sm text-muted-foreground">This week</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Hours Worked</h3>
                <div className="text-3xl font-bold text-blue-600">{weeklyStats.hoursWorked.toFixed(1)}</div>
                <p className="text-sm text-muted-foreground">This week</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Days Active</h3>
                <div className="text-3xl font-bold text-green-600">{weeklyStats.daysWorked}</div>
                <p className="text-sm text-muted-foreground">Out of 7 days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-accent/20" onClick={() => navigate("/hunter")}>
            <CardContent className="p-6 text-center">
              <Building2 className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Manage Leads</h3>
              <p className="text-sm text-muted-foreground">Add, edit, and organize your leads</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-accent/20" onClick={() => navigate("/performance")}>
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Performance</h3>
              <p className="text-sm text-muted-foreground">View detailed analytics and reports</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-accent/20">
            <CardContent className="p-6 text-center">
              <Award className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Achievements</h3>
              <p className="text-sm text-muted-foreground">Track your milestones and goals</p>
            </CardContent>
          </Card>
        </div>

        {/* Motivational Message */}
        <Card className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">Keep Up the Great Work! 🎯</h3>
            <p className="text-muted-foreground">
              {progressPercentage >= 100 
                ? "Congratulations! You've reached your daily target!"
                : progressPercentage >= 75
                ? "You're almost there! Just a few more leads to go!"
                : progressPercentage >= 50
                ? "Great progress! Keep building momentum!"
                : "Every lead counts! Let's get started!"}
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default HunterHome;
