import { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, query, doc, updateDoc, Timestamp, addDoc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Phone, MapPin, Tag, Clock, User, Building2, MessageSquare,
  ThumbsUp, ThumbsDown, RotateCcw, ExternalLink, Download, StickyNote,
  Target, TrendingUp, CheckCircle2, XCircle, Timer, Search, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { exportLeadsToCSV, exportLeadsToPDF } from "@/lib/exportUtils";

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

type FilterStatus = "all" | "pending" | "interested" | "rejected";

const categories = [
  "Restaurant", "Shop", "Electricity", "Hospital", "School", "College", 
  "Salon", "Hotel", "Other"
];

const CallerDashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [callerNotes, setCallerNotes] = useState<Record<string, string>>({});
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dailyTarget] = useState(100); // 100 calls per day target
  const [todayStats, setTodayStats] = useState({ callsMade: 0, hoursWorked: 0, interestedCount: 0, rejectedCount: 0 });
  const [weeklyPerformance, setWeeklyPerformance] = useState({
    totalCalls: 0,
    totalInterested: 0,
    totalRejected: 0,
    avgConversion: 0,
    avgEfficiency: 0,
    daysActive: 0
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
      setLeads(data);
      // Initialize caller notes from existing data
      const notes: Record<string, string> = {};
      data.forEach(l => { notes[l.id] = l.callerNote || ""; });
      setCallerNotes(prev => ({ ...notes, ...prev }));
      
      // Calculate today's call statistics
      const today = new Date().toDateString();
      let callsMade = 0;
      let interestedCount = 0;
      let rejectedCount = 0;
      
      data.forEach(lead => {
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
      if (todayStatsData) {
        const stats = JSON.parse(todayStatsData);
        hoursWorked = stats.hoursWorked || 0;
      }
      
      // Update state
      setTodayStats({ callsMade, hoursWorked, interestedCount, rejectedCount });
      
      // Save daily stats to Firebase
      saveDailyStatsToFirebase(today, callsMade, interestedCount, rejectedCount, hoursWorked);
    });
    return unsub;
  }, [user]);

  // Fetch weekly performance data from Firebase
  useEffect(() => {
    if (!user) return;

    const fetchWeeklyPerformance = async () => {
      try {
        const today = new Date();
        const currentDay = today.getDay(); // 0 = Sunday, 6 = Saturday
        const sunday = new Date(today);
        sunday.setDate(today.getDate() - currentDay); // Go back to Sunday
        
        let totalCalls = 0;
        let totalInterested = 0;
        let totalRejected = 0;
        let totalHours = 0;
        let daysActive = 0;
        
        // Fetch stats for each day of the week
        for (let i = 0; i < 7; i++) {
          const date = new Date(sunday);
          date.setDate(sunday.getDate() + i);
          const dateString = date.toDateString();
          
          try {
            const statsDoc = doc(db, "dailyStats", `${dateString}_${user.uid}`);
            const statsSnap = await getDoc(statsDoc);
            
            if (statsSnap.exists()) {
              const stats = statsSnap.data();
              totalCalls += stats.callsMade || 0;
              totalInterested += stats.interestedCount || 0;
              totalRejected += stats.rejectedCount || 0;
              totalHours += stats.hoursWorked || 0;
              if (stats.callsMade > 0) daysActive++;
            }
          } catch (error) {
            // Document might not exist, continue
          }
        }
        
        const avgConversion = totalCalls > 0 ? ((totalInterested / totalCalls) * 100).toFixed(1) : '0';
        const avgEfficiency = totalHours > 0 ? (totalCalls / totalHours).toFixed(1) : '0';
        
        setWeeklyPerformance({
          totalCalls,
          totalInterested,
          totalRejected,
          avgConversion: parseFloat(avgConversion),
          avgEfficiency: parseFloat(avgEfficiency),
          daysActive
        });
      } catch (error) {
        console.error("Error fetching weekly performance:", error);
      }
    };

    fetchWeeklyPerformance();
  }, [user]);

  const saveDailyStatsToFirebase = async (date: string, callsMade: number, interestedCount: number, rejectedCount: number, hoursWorked: number) => {
    if (!user) return;
    
    try {
      const statsDoc = {
        userId: user.uid,
        date: date,
        callsMade,
        interestedCount,
        rejectedCount,
        hoursWorked,
        conversionRate: callsMade > 0 ? ((interestedCount / callsMade) * 100).toFixed(1) : '0',
        efficiency: hoursWorked > 0 ? (callsMade / hoursWorked).toFixed(1) : '0',
        timestamp: Timestamp.now(),
        role: 'caller'
      };
      
      // Use date + userId as document ID for daily stats
      await setDoc(doc(db, "dailyStats", `${date}_${user.uid}`), statsDoc, { merge: true });
    } catch (error) {
      console.error("Error saving daily stats to Firebase:", error);
    }
  };

  const openLeadModal = (lead: Lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedLead(null);
    setIsModalOpen(false);
  };

  const updateLeadStatus = async (status: 'interested' | 'rejected') => {
    if (!selectedLead) return;
    
    const note = callerNotes[selectedLead.id] || '';
    
    try {
      await updateDoc(doc(db, "leads", selectedLead.id), {
        status,
        callerNote: note,
        updatedAt: Timestamp.now(),
        calledBy: user?.uid
      });
      
      toast({
        title: "Lead updated",
        description: `Lead marked as ${status}${note ? ' with notes' : ''}`,
      });
      
      // Clear notes for this lead and close modal
      setCallerNotes(prev => ({ ...prev, [selectedLead.id]: '' }));
      closeModal();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update lead status",
        variant: "destructive",
      });
    }
  };

  const updateStatus = async (leadId: string, status: string) => {
    try {
      await updateDoc(doc(db, "leads", leadId), { status, updatedAt: Timestamp.now() });
      toast({ title: "Status updated", description: `Lead marked as ${status}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const filtered = leads.filter(lead => {
    const matchesStatus = filter === "all" || lead.status === filter;
    const matchesSearch = 
      lead.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.callerNote && lead.callerNote.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || lead.category === categoryFilter;
    
    return matchesStatus && matchesSearch && matchesCategory;
  });
  const counts = {
    all: leads.length,
    pending: leads.filter(l => l.status === "pending").length,
    interested: leads.filter(l => l.status === "interested").length,
    rejected: leads.filter(l => l.status === "rejected").length,
  };

  const formatDate = (ts: any) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const statusBadge = (status: string) => {
    const cls = status === "pending" ? "status-pending" : status === "interested" ? "status-interested" : "status-rejected";
    return <Badge variant="outline" className={cn("text-xs font-semibold capitalize border", cls)}>{status}</Badge>;
  };

  const filterButtons: { key: FilterStatus; label: string; color: string }[] = [
    { key: "all", label: "All", color: "bg-primary text-primary-foreground" },
    { key: "pending", label: "Pending", color: "bg-yellow-500 text-primary-foreground" },
    { key: "interested", label: "Interested", color: "bg-emerald-500 text-primary-foreground" },
    { key: "rejected", label: "Rejected", color: "bg-red-500 text-primary-foreground" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Caller Dashboard</h2>
            <p className="text-sm text-muted-foreground">Make calls and track lead responses</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportLeadsToCSV(filtered)}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportLeadsToPDF(filtered, "Caller Leads Report")}>
              <Download className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>
        </div>

        {/* Call Statistics Dashboard */}
        <Card className="border-accent/30">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Daily Target</h3>
                <div className="text-3xl font-bold text-accent">{dailyTarget}</div>
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
                <p className="text-sm text-muted-foreground">Positive responses</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Rejected</h3>
                <div className="text-3xl font-bold text-red-600">{todayStats.rejectedCount}</div>
                <p className="text-sm text-muted-foreground">Not interested</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Daily Call Progress</span>
                <span className="text-sm text-muted-foreground">
                  {todayStats.callsMade} / {dailyTarget} calls
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div 
                  className="bg-accent h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((todayStats.callsMade / dailyTarget) * 100, 100)}%` }}
                />
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {Math.min((todayStats.callsMade / dailyTarget) * 100, 100).toFixed(1)}% of daily target
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {filterButtons.map(fb => (
            <button
              key={fb.key}
              onClick={() => setFilter(fb.key)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                filter === fb.key
                  ? fb.color + " shadow-md scale-105"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {fb.label}
              <span className={cn(
                "inline-flex items-center justify-center h-5 min-w-[20px] rounded-full text-xs font-bold px-1.5",
                filter === fb.key ? "bg-background/20" : "bg-background"
              )}>
                {counts[fb.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Search and Category Filters */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Category:</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {filtered.length} lead{filtered.length !== 1 ? 's' : ''} found
          </div>
        </div>

        {/* Compact Lead List */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold">Business</th>
                    <th className="text-left p-3 font-semibold hidden sm:table-cell">Phone</th>
                    <th className="text-left p-3 font-semibold hidden md:table-cell">Category</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted-foreground p-8">
                        {filter === "all" ? "No leads found." : `No ${filter} leads found.`}
                      </td>
                    </tr>
                  ) : (
                    filtered.map(lead => (
                      <tr 
                        key={lead.id} 
                        className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => openLeadModal(lead)}
                      >
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{lead.businessName}</div>
                            <div className="text-xs text-muted-foreground">{lead.ownerName}</div>
                            {lead.city && <div className="text-xs text-muted-foreground">{lead.city}</div>}
                          </div>
                        </td>
                        <td className="p-3 hidden sm:table-cell">
                          <a href={`tel:${lead.phone}`} className="text-accent hover:underline">{lead.phone}</a>
                        </td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground">{lead.category}</td>
                        <td className="p-3">
                          {statusBadge(lead.status)}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                openLeadModal(lead);
                              }}
                              className="h-7 px-2 text-xs"
                            >
                              View
                            </Button>
                            {lead.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateStatus(lead.id, "interested");
                                  }}
                                  className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                                >
                                  ✓
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateStatus(lead.id, "rejected");
                                  }}
                                  className="h-7 px-2 text-xs bg-red-600 hover:bg-red-700 text-white"
                                >
                                  ✗
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Lead Details Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="w-full max-w-lg mx-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-accent" />
                {selectedLead?.businessName}
              </DialogTitle>
            </DialogHeader>
            
            {selectedLead && (
              <div className="space-y-6">
                {/* Lead Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
                    <div className="text-foreground font-medium">{selectedLead.ownerName}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <div className="text-accent font-medium">
                      <a href={`tel:${selectedLead.phone}`} className="hover:underline">{selectedLead.phone}</a>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                    <div className="text-foreground">{selectedLead.category}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">City</label>
                    <div className="text-foreground">{selectedLead.city || 'Not specified'}</div>
                  </div>
                </div>

                {/* Original Notes */}
                {selectedLead.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">Original Notes</label>
                    <div className="text-sm bg-muted/50 rounded-md p-3">
                      {selectedLead.notes}
                    </div>
                  </div>
                )}

                {/* Call Notes */}
                <div>
                  <label className="text-sm font-medium block mb-2">Call Notes</label>
                  <textarea
                    value={callerNotes[selectedLead.id] || ''}
                    onChange={(e) => setCallerNotes(prev => ({ ...prev, [selectedLead.id]: e.target.value }))}
                    placeholder="Enter call details, customer response, follow-up notes..."
                    className="w-full p-3 border rounded-md text-sm resize-none"
                    rows={4}
                  />
                </div>

                {/* Previous Call Note */}
                {selectedLead.callerNote && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">Previous Call Note</label>
                    <div className="text-sm bg-muted/50 rounded-md p-3">
                      {selectedLead.callerNote}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => updateLeadStatus('interested')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Interested
                  </Button>
                  <Button
                    onClick={() => updateLeadStatus('rejected')}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejected
                  </Button>
                  <Button
                    onClick={closeModal}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Weekly Performance */}
        <Card className="border-accent/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-accent" />
              Weekly Performance (Sunday - Saturday)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Total Calls</h3>
                <div className="text-3xl font-bold text-accent">{weeklyPerformance.totalCalls}</div>
                <p className="text-sm text-muted-foreground">This week</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Avg Conversion</h3>
                <div className="text-3xl font-bold text-green-600">{weeklyPerformance.avgConversion.toFixed(1)}%</div>
                <p className="text-sm text-muted-foreground">Success rate</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Avg Efficiency</h3>
                <div className="text-3xl font-bold text-purple-600">{weeklyPerformance.avgEfficiency.toFixed(1)}</div>
                <p className="text-sm text-muted-foreground">Calls per hour</p>
              </div>
            </div>
            
            {/* Performance Breakdown */}
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-semibold mb-4">Performance Breakdown</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{weeklyPerformance.totalInterested}</div>
                  <div className="text-xs text-muted-foreground">Interested</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{weeklyPerformance.totalRejected}</div>
                  <div className="text-xs text-muted-foreground">Rejected</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{weeklyPerformance.daysActive}</div>
                  <div className="text-xs text-muted-foreground">Days Active</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-accent">
                    {weeklyPerformance.daysActive > 0 ? (weeklyPerformance.totalCalls / weeklyPerformance.daysActive).toFixed(0) : 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Daily Calls</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CallerDashboard;
