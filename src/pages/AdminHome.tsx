import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, Clock, Award, Calendar, Users, BarChart3, CheckCircle, Building2, Phone, Settings, FileText, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { collection, query, onSnapshot, orderBy, getDoc, doc, getDocs } from "firebase/firestore";
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
  addedBy: string;
}

const AdminHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalLeads: 0,
    todayLeads: 0,
    pendingLeads: 0,
    interestedLeads: 0,
    rejectedLeads: 0,
    totalUsers: 0,
    activeToday: 0
  });
  const [callerPerformance, setCallerPerformance] = useState({
    totalCalls: 0,
    avgConversion: 0,
    avgEfficiency: 0,
    activeCallers: 0
  });
  const [hunterPerformance, setHunterPerformance] = useState({
    totalLeadsAdded: 0,
    avgDailyLeads: 0,
    avgEfficiency: 0,
    activeHunters: 0
  });

  useEffect(() => {
    if (!user) return;

    // Fetch all leads data from Firestore
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, async (snap) => {
      const leadsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
      
      // Calculate statistics
      const today = new Date().toDateString();
      let todayLeads = 0;
      let pendingLeads = 0;
      let interestedLeads = 0;
      let rejectedLeads = 0;
      const activeUsers = new Set();
      
      leadsData.forEach(lead => {
        const leadDate = lead.createdAt?.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt);
        
        // Count today's leads
        if (leadDate.toDateString() === today) {
          todayLeads++;
          activeUsers.add(lead.addedBy);
        }
        
        // Count by status
        if (lead.status === 'pending') pendingLeads++;
        else if (lead.status === 'interested') interestedLeads++;
        else if (lead.status === 'rejected') rejectedLeads++;
      });
      
      setStats({
        totalLeads: leadsData.length,
        todayLeads,
        pendingLeads,
        interestedLeads,
        rejectedLeads,
        totalUsers: activeUsers.size, // This would be better with a separate users collection
        activeToday: activeUsers.size
      });

      // Fetch weekly performance data for callers and hunters
      await fetchPerformanceData();
    });
    
    return unsub;
  }, [user]);

  const fetchPerformanceData = async () => {
    try {
      const today = new Date();
      const currentDay = today.getDay(); // 0 = Sunday, 6 = Saturday
      const sunday = new Date(today);
      sunday.setDate(today.getDate() - currentDay); // Go back to Sunday
      
      // Fetch daily stats for the week
      let totalCalls = 0;
      let totalInterested = 0;
      let totalHours = 0;
      let activeCallers = new Set();
      let totalLeadsAdded = 0;
      let totalHunterHours = 0;
      let activeHunters = new Set();
      
      // Fetch all daily stats documents
      const dailyStatsQuery = query(collection(db, "dailyStats"));
      const querySnapshot = await getDocs(dailyStatsQuery);
      
      querySnapshot.forEach(doc => {
        const stats = doc.data();
        const statDate = new Date(stats.date);
        
        // Check if this stat is from this week (Sunday to Saturday)
        if (statDate >= sunday && statDate <= today) {
          if (stats.role === 'caller') {
            totalCalls += stats.callsMade || 0;
            totalInterested += stats.interestedCount || 0;
            totalHours += stats.hoursWorked || 0;
            if (stats.callsMade > 0) activeCallers.add(stats.userId);
          } else if (stats.role === 'lead_hunter') {
            totalLeadsAdded += stats.callsMade || 0; // Using callsMade for leads added
            totalHunterHours += stats.hoursWorked || 0;
            if (stats.callsMade > 0) activeHunters.add(stats.userId);
          }
        }
      });
      
      const avgConversion = totalCalls > 0 ? ((totalInterested / totalCalls) * 100) : 0;
      const avgEfficiency = totalHours > 0 ? (totalCalls / totalHours) : 0;
      const avgDailyLeads = activeHunters.size > 0 ? (totalLeadsAdded / activeHunters.size) : 0;
      const hunterAvgEfficiency = totalHunterHours > 0 ? (totalLeadsAdded / totalHunterHours) : 0;
      
      setCallerPerformance({
        totalCalls,
        avgConversion,
        avgEfficiency,
        activeCallers: activeCallers.size
      });
      
      setHunterPerformance({
        totalLeadsAdded,
        avgDailyLeads,
        avgEfficiency: hunterAvgEfficiency,
        activeHunters: activeHunters.size
      });
    } catch (error) {
      console.error("Error fetching performance data:", error);
    }
  };

  // Real-time listener for daily stats
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "dailyStats"));
    const unsub = onSnapshot(q, () => {
      // Refetch performance data when daily stats change
      fetchPerformanceData();
    });
    
    return unsub;
  }, [user]);

  const conversionRate = stats.totalLeads > 0 ? ((stats.interestedLeads / stats.totalLeads) * 100).toFixed(1) : '0';
  const todayConversionRate = stats.todayLeads > 0 ? ((stats.interestedLeads / stats.todayLeads) * 100).toFixed(1) : '0';

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Overview of system performance and user activity</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge className="bg-purple-100 text-purple-800 border-purple-200">
              <Shield className="w-3 h-3 mr-1" />Administrator
            </Badge>
            <Button onClick={() => navigate("/admin")} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Settings className="w-4 h-4 mr-2" />Admin Panel
            </Button>
          </div>
        </div>

        {/* System Overview */}
        <Card className="border-accent/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-accent" />
              System Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Total Leads</h3>
                <div className="text-3xl font-bold text-accent">{stats.totalLeads}</div>
                <p className="text-sm text-muted-foreground">In database</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Today's Leads</h3>
                <div className="text-3xl font-bold text-green-600">{stats.todayLeads}</div>
                <p className="text-sm text-muted-foreground">Added today</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Conversion Rate</h3>
                <div className="text-3xl font-bold text-purple-600">{conversionRate}%</div>
                <p className="text-sm text-muted-foreground">Overall</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Active Users</h3>
                <div className="text-3xl font-bold text-blue-600">{stats.activeToday}</div>
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-accent" />
              Lead Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Pending</h3>
                <div className="text-3xl font-bold text-yellow-600">{stats.pendingLeads}</div>
                <p className="text-sm text-muted-foreground">Awaiting calls</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Interested</h3>
                <div className="text-3xl font-bold text-green-600">{stats.interestedLeads}</div>
                <p className="text-sm text-muted-foreground">Positive responses</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Rejected</h3>
                <div className="text-3xl font-bold text-red-600">{stats.rejectedLeads}</div>
                <p className="text-sm text-muted-foreground">Not interested</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Caller Performance */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-600" />
                Caller Performance (This Week)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Total Calls</h3>
                  <div className="text-2xl font-bold text-green-600">{callerPerformance.totalCalls}</div>
                  <p className="text-xs text-muted-foreground">Weekly</p>
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Conversion</h3>
                  <div className="text-2xl font-bold text-emerald-600">{callerPerformance.avgConversion.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Success rate</p>
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Efficiency</h3>
                  <div className="text-2xl font-bold text-teal-600">{callerPerformance.avgEfficiency.toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground">Calls/hour</p>
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Active Callers</h3>
                  <div className="text-2xl font-bold text-blue-600">{callerPerformance.activeCallers}</div>
                  <p className="text-xs text-muted-foreground">This week</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hunter Performance */}
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Hunter Performance (This Week)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Leads Added</h3>
                  <div className="text-2xl font-bold text-blue-600">{hunterPerformance.totalLeadsAdded}</div>
                  <p className="text-xs text-muted-foreground">Weekly</p>
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Daily Avg</h3>
                  <div className="text-2xl font-bold text-indigo-600">{hunterPerformance.avgDailyLeads.toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground">Per hunter</p>
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Efficiency</h3>
                  <div className="text-2xl font-bold text-purple-600">{hunterPerformance.avgEfficiency.toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground">Leads/hour</p>
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Active Hunters</h3>
                  <div className="text-2xl font-bold text-orange-600">{hunterPerformance.activeHunters}</div>
                  <p className="text-xs text-muted-foreground">This week</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-accent/20" onClick={() => navigate("/admin")}>
            <CardContent className="p-6 text-center">
              <Settings className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Admin Panel</h3>
              <p className="text-sm text-muted-foreground">System settings</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-accent/20" onClick={() => navigate("/performance")}>
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Analytics</h3>
              <p className="text-sm text-muted-foreground">View reports</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-accent/20" onClick={() => navigate("/hunter")}>
            <CardContent className="p-6 text-center">
              <Building2 className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Hunters</h3>
              <p className="text-sm text-muted-foreground">Manage hunters</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-accent/20" onClick={() => navigate("/caller")}>
            <CardContent className="p-6 text-center">
              <Phone className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Callers</h3>
              <p className="text-sm text-muted-foreground">Monitor calls</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <Card className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Today's Performance</h4>
                <p className="text-2xl font-bold text-green-600 mb-1">{stats.todayLeads}</p>
                <p className="text-sm text-muted-foreground">Leads added today</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Pipeline Health</h4>
                <p className="text-2xl font-bold text-yellow-600 mb-1">{stats.pendingLeads}</p>
                <p className="text-sm text-muted-foreground">Leads in pipeline</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Success Rate</h4>
                <p className="text-2xl font-bold text-green-600 mb-1">{conversionRate}%</p>
                <p className="text-sm text-muted-foreground">Overall conversion</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <h4 className="font-semibold">Database</h4>
                  <p className="text-sm text-muted-foreground">All systems operational</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <h4 className="font-semibold">User Activity</h4>
                  <p className="text-sm text-muted-foreground">{stats.activeToday} active today</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <h4 className="font-semibold">Lead Processing</h4>
                  <p className="text-sm text-muted-foreground">{stats.pendingLeads} leads in queue</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <h4 className="font-semibold">Performance</h4>
                  <p className="text-sm text-muted-foreground">Optimal performance</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Message */}
        <Card className="bg-gradient-to-r from-purple-10 to-purple-5 border-purple/20">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">System Running Smoothly 🚀</h3>
            <p className="text-muted-foreground">
              All systems operational. {stats.activeToday} users active today with {stats.todayLeads} new leads added.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminHome;
