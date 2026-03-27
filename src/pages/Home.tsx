import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, Clock, Award, Calendar, Users, BarChart3, CheckCircle } from "lucide-react";
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

const Home = () => {
  const { user, role } = useAuth();
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
    if (progressPercentage >= 100) return { text: "Target Achieved", variant: "default" as const, color: "bg-green-100 text-green-800" };
    if (progressPercentage >= 75) return { text: "On Track", variant: "secondary" as const, color: "bg-yellow-100 text-yellow-800" };
    if (progressPercentage >= 50) return { text: "Making Progress", variant: "outline" as const, color: "bg-blue-100 text-blue-800" };
    return { text: "Needs Focus", variant: "destructive" as const, color: "bg-red-100 text-red-800" };
  };

  const statusBadge = getStatusBadge();

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Welcome Back! 👋</h1>
          <p className="text-xl text-muted-foreground">Let's achieve your targets today</p>
        </div>

        {/* Today's Target Card */}
        <Card className="mb-8 border-2 border-accent/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Target className="h-6 w-6 text-accent" />
              Today's Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-accent mb-2">{DAILY_TARGET}</div>
                <p className="text-sm text-muted-foreground">Daily Target</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground mb-2">{todayStats.leadsAdded}</div>
                <p className="text-sm text-muted-foreground">Leads Added</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground mb-2">{remainingLeads}</div>
                <p className="text-sm text-muted-foreground">Remaining</p>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${getProgressColor()} mb-2`}>
                  {progressPercentage.toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground">Progress</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Progress to Target</span>
                <Badge className={statusBadge.color}>{statusBadge.text}</Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-4">
                <div 
                  className="bg-accent h-4 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium text-muted-foreground">Work Hours</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{todayStats.hoursWorked.toFixed(1)}h</div>
              <div className="text-xs text-muted-foreground">Today</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium text-muted-foreground">Efficiency</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{efficiency}</div>
              <div className="text-xs text-muted-foreground">Leads per hour</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium text-muted-foreground">This Week</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{weeklyStats.leadsAdded}</div>
              <div className="text-xs text-muted-foreground">Total leads</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium text-muted-foreground">Active Days</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{weeklyStats.daysWorked}/7</div>
              <div className="text-xs text-muted-foreground">This week</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        {role === "lead_hunter" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-accent/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => navigate("/hunter")} 
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Add New Lead
                </Button>
                <Button 
                  onClick={() => navigate("/performance")} 
                  variant="outline" 
                  className="w-full"
                >
                  View Performance
                </Button>
              </CardContent>
            </Card>

            <Card className="border-accent/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-accent" />
                  Today's Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Work Status</span>
                    <Badge variant={isWorking ? "default" : "secondary"}>
                      {isWorking ? "Working" : "Not Started"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Target Progress</span>
                    <Badge className={statusBadge.color}>{statusBadge.text}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Daily Goal</span>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium">{DAILY_TARGET} leads</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Motivational Message */}
        <Card className="mt-8 bg-gradient-to-r from-accent/10 to-accent/5 border-accent/30">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {progressPercentage >= 100 
                ? "🎉 Congratulations! Target Achieved!" 
                : progressPercentage >= 75 
                ? "💪 Great Progress! Keep Going!" 
                : "🚀 Let's Crush Today's Target!"
              }
            </h3>
            <p className="text-muted-foreground">
              {progressPercentage >= 100 
                ? `You've added ${todayStats.leadsAdded} leads today! Amazing work!`
                : `You're ${progressPercentage.toFixed(1)}% there. ${remainingLeads} more leads to reach your daily target!`
              }
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Home;
