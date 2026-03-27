import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Clock, Target, Calendar, BarChart3, Award, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyStats {
  date: string;
  leadsAdded: number;
  hoursWorked: number;
  dayName: string;
}

const Performance = () => {
  const { user } = useAuth();
  const [weeklyStats, setWeeklyStats] = useState<DailyStats[]>([]);
  const [totalStats, setTotalStats] = useState({ leadsAdded: 0, hoursWorked: 0, daysWorked: 0 });
  const [todayStats, setTodayStats] = useState({ leadsAdded: 0, hoursWorked: 0, isWorking: false });

  useEffect(() => {
    if (!user) return;

    const stats: DailyStats[] = [];
    let totalLeads = 0;
    let totalHours = 0;
    let daysWorked = 0;
    let todayLeads = 0;
    let todayHours = 0;
    let isWorking = false;

    // Get stats for Sunday to Saturday (current week)
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 6 = Saturday
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - currentDay); // Go back to Sunday
    sunday.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + i); // Sunday + i days
      
      const dateKey = date.toDateString();
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const savedStats = localStorage.getItem(`workStats_${user.uid}_${dateKey}`);
      
      let leadsAdded = 0;
      let hoursWorked = 0;
      
      if (savedStats) {
        const stats = JSON.parse(savedStats);
        leadsAdded = stats.leadsAdded || 0;
        hoursWorked = stats.hoursWorked || 0;
        
        totalLeads += leadsAdded;
        totalHours += hoursWorked;
        if (hoursWorked > 0) daysWorked++;
        
        // Check if today
        if (i === currentDay) {
          todayLeads = leadsAdded;
          todayHours = hoursWorked;
          isWorking = stats.startTime && !stats.endTime;
        }
      }
      
      stats.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        leadsAdded,
        hoursWorked,
        dayName
      });
    }
    
    setWeeklyStats(stats);
    setTotalStats({ leadsAdded: totalLeads, hoursWorked: totalHours, daysWorked });
    setTodayStats({ leadsAdded: todayLeads, hoursWorked: todayHours, isWorking });
  }, [user]);

  const averageLeadsPerDay = totalStats.daysWorked > 0 ? (totalStats.leadsAdded / totalStats.daysWorked).toFixed(1) : '0';
  const averageHoursPerDay = totalStats.daysWorked > 0 ? (totalStats.hoursWorked / totalStats.daysWorked).toFixed(1) : '0';

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Performance Analytics</h1>
            <p className="text-muted-foreground">Track your work progress and achievements</p>
          </div>
          <Badge variant="outline" className="text-sm">
            Last 7 Days
          </Badge>
        </div>

        {/* Today's Status */}
        <Card className="border-accent/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Today's Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">{todayStats.leadsAdded}</div>
                <p className="text-sm text-muted-foreground">Leads Added</p>
                <div className="text-xs text-muted-foreground mt-1">
                  {todayStats.isWorking ? "Currently working" : "Completed"}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">{todayStats.hoursWorked.toFixed(1)}h</div>
                <p className="text-sm text-muted-foreground">Hours Worked</p>
                <div className="text-xs text-muted-foreground mt-1">
                  {todayStats.isWorking ? "Timer running" : "Day completed"}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">
                  {todayStats.hoursWorked > 0 ? (todayStats.leadsAdded / todayStats.hoursWorked).toFixed(1) : '0'}
                </div>
                <p className="text-sm text-muted-foreground">Leads per Hour</p>
                <div className="text-xs text-muted-foreground mt-1">Efficiency rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium text-muted-foreground">Total Leads</span>
              </div>
              <div className="text-2xl font-bold text-foreground mt-2">{totalStats.leadsAdded}</div>
              <div className="text-xs text-muted-foreground">This week</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium text-muted-foreground">Total Hours</span>
              </div>
              <div className="text-2xl font-bold text-foreground mt-2">{totalStats.hoursWorked.toFixed(1)}h</div>
              <div className="text-xs text-muted-foreground">This week</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium text-muted-foreground">Days Active</span>
              </div>
              <div className="text-2xl font-bold text-foreground mt-2">{totalStats.daysWorked}/7</div>
              <div className="text-xs text-muted-foreground">This week</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium text-muted-foreground">Avg Daily</span>
              </div>
              <div className="text-2xl font-bold text-foreground mt-2">{averageLeadsPerDay}</div>
              <div className="text-xs text-muted-foreground">Leads per working day</div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              Performance Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-accent mb-2">{averageHoursPerDay}h</div>
                <p className="text-sm text-muted-foreground">Average work hours per day</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent mb-2">{averageLeadsPerDay}</div>
                <p className="text-sm text-muted-foreground">Average leads per working day</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent mb-2">
                  {totalStats.hoursWorked > 0 ? (totalStats.leadsAdded / totalStats.hoursWorked).toFixed(1) : '0'}
                </div>
                <p className="text-sm text-muted-foreground">Overall efficiency (leads/hour)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Performance;
