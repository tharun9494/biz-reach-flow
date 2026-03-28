import { useState, useEffect } from "react";
import { collection, addDoc, query, where, onSnapshot, orderBy, Timestamp, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, Loader2, Download, Edit2, Trash2, Search, MessageSquare } from "lucide-react";
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
  createdAt: any;
  updatedAt: any;
  addedBy: string;
}

const categories = [
  "Restaurant", 
  "Shop", 
  "Electricity", 
  "Hospital", 
  "School", 
  "College", 
  "Salon", 
  "Hotel", 
  "Other"
];

const HunterDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [todayStats, setTodayStats] = useState({ leadsAdded: 0, hoursWorked: 0 });
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [dailyTarget] = useState(300);
  const [form, setForm] = useState({
    businessName: "", ownerName: "", phone: "", locationUrl: "", city: "", category: "", notes: "",
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "leads"),
      where("addedBy", "==", user.uid)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const leadsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
      setLeads(leadsData);
      
      // Calculate today's leads
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayLeads = leadsData.filter(lead => {
        const leadDate = lead.createdAt?.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt);
        return leadDate >= today;
      });
      
      // Update today's stats and save to Firebase
      const updatedStats = { ...todayStats, leadsAdded: todayLeads.length };
      setTodayStats(updatedStats);
      saveWorkStats(updatedStats);
    });
    
    return unsub;
  }, [user]);

  // Load today's work session
  useEffect(() => {
    const savedStats = localStorage.getItem(`workStats_${user?.uid}_${new Date().toDateString()}`);
    if (savedStats) {
      const stats = JSON.parse(savedStats);
      setTodayStats(stats);
      // Only set startTime if work day hasn't ended yet
      if (stats.startTime && !stats.endTime) {
        setStartTime(new Date(stats.startTime));
      }
    } else {
      // Auto-start work day if no stats exist for today
      const now = new Date();
      setStartTime(now);
      const newStats = { leadsAdded: 0, hoursWorked: 0, startTime: now.toISOString() };
      setTodayStats(newStats);
      saveWorkStats(newStats);
    }
  }, [user]);

  // Save work session
  const saveWorkStats = (stats: any) => {
    localStorage.setItem(`workStats_${user?.uid}_${new Date().toDateString()}`, JSON.stringify(stats));
    
    // Also save to Firebase for admin dashboard
    saveDailyStatsToFirebase(stats);
  };

  const saveDailyStatsToFirebase = async (stats: any) => {
    if (!user) return;
    
    try {
      const today = new Date().toDateString();
      const statsDoc = {
        userId: user.uid,
        date: today,
        callsMade: stats.leadsAdded || 0, // Use leadsAdded as callsMade for hunters
        interestedCount: 0, // Hunters don't track interested/rejected
        rejectedCount: 0,
        hoursWorked: stats.hoursWorked || 0,
        conversionRate: '0',
        efficiency: stats.hoursWorked > 0 ? ((stats.leadsAdded || 0) / stats.hoursWorked).toFixed(1) : '0',
        timestamp: Timestamp.now(),
        role: 'lead_hunter'
      };
      
      // Use date + userId as document ID for daily stats
      await setDoc(doc(db, "dailyStats", `${today}_${user.uid}`), statsDoc, { merge: true });
    } catch (error) {
      console.error("Error saving hunter daily stats to Firebase:", error);
    }
  };

  const endWorkDay = () => {
    if (!startTime) return;
    const endTime = new Date();
    const hoursWorked = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const newStats = { ...todayStats, hoursWorked, endTime: endTime.toISOString() };
    setTodayStats(newStats);
    saveWorkStats(newStats);
    setStartTime(null);
    toast({ title: "Work day ended!", description: `You worked ${hoursWorked.toFixed(1)} hours today.` });
  };

  const restartWorkDay = () => {
    const now = new Date();
    setStartTime(now);
    const newStats = { 
      leadsAdded: todayStats.leadsAdded, 
      hoursWorked: 0, 
      startTime: now.toISOString(),
      endTime: undefined
    };
    setTodayStats(newStats);
    saveWorkStats(newStats);
    toast({ title: "Work day restarted!", description: "Timer is now running again." });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim() || !form.phone.trim() || !form.category) {
      toast({ title: "Missing fields", description: "Fill in required fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      if (editingLead) {
        // Update existing lead
        await updateDoc(doc(db, "leads", editingLead.id), {
          ...form,
          updatedAt: Timestamp.now(),
        });
        toast({ title: "Lead updated!", description: `${form.businessName} updated successfully.` });
      } else {
        // Add new lead
        await addDoc(collection(db, "leads"), {
          ...form,
          status: "pending",
          callerNote: "",
          addedBy: user!.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        toast({ title: "Lead added!", description: `${form.businessName} saved successfully.` });
      }
      setForm({ businessName: "", ownerName: "", phone: "", locationUrl: "", city: "", category: "", notes: "" });
      setShowForm(false);
      setEditingLead(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      businessName: lead.businessName,
      ownerName: lead.ownerName,
      phone: lead.phone,
      locationUrl: lead.locationUrl,
      city: lead.city,
      category: lead.category,
      notes: lead.notes,
    });
    setShowForm(true);
  };

  const handleDelete = async (leadId: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    
    try {
      await deleteDoc(doc(db, "leads", leadId));
      toast({ title: "Lead deleted", description: "Lead has been removed successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setForm({ businessName: "", ownerName: "", phone: "", locationUrl: "", city: "", category: "", notes: "" });
    setShowForm(false);
    setEditingLead(null);
  };

  // Filter leads based on search term and category
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.notes.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || lead.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const statusBadge = (status: string) => {
    const cls = status === "interested" ? "status-interested" : "status-rejected";
    return <Badge variant="outline" className={cn("text-xs font-semibold capitalize border", cls)}>{status}</Badge>;
  };

  const formatDate = (ts: any) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Work Stats Dashboard */}
        <Card className="border-accent/30">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Daily Target</h3>
                <div className="text-3xl font-bold text-accent">{dailyTarget}</div>
                <p className="text-sm text-muted-foreground">Leads</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Today's Progress</h3>
                <div className="text-3xl font-bold text-accent">{todayStats.leadsAdded}</div>
                <p className="text-sm text-muted-foreground">Leads Added</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Work Hours</h3>
                <div className="text-3xl font-bold text-accent">
                  {startTime 
                    ? `${((new Date().getTime() - startTime.getTime()) / (1000 * 60 * 60)).toFixed(1)}h`
                    : `${todayStats.hoursWorked.toFixed(1)}h`
                  }
                </div>
                <p className="text-sm text-muted-foreground">
                  {startTime ? "Currently working" : "Today's total"}
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Progress</h3>
                <div className="text-3xl font-bold text-accent">
                  {Math.min((todayStats.leadsAdded / dailyTarget) * 100, 100).toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground">
                  {Math.max(dailyTarget - todayStats.leadsAdded, 0)} remaining
                </p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Daily Target Progress</span>
                <span className="text-sm text-muted-foreground">
                  {todayStats.leadsAdded} / {dailyTarget} leads
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div 
                  className="bg-accent h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((todayStats.leadsAdded / dailyTarget) * 100, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Lead Hunter Dashboard</h2>
            <p className="text-sm text-muted-foreground">Find businesses and add them as leads</p>
          </div>
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
            <Button variant="outline" size="sm" onClick={() => exportLeadsToCSV(filteredLeads)}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportLeadsToPDF(filteredLeads, "My Leads Report")}>
              <Download className="h-4 w-4 mr-1" /> PDF
            </Button>
            <Button onClick={() => setShowForm(!showForm)} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-1" /> Add Lead
            </Button>
          </div>
        </div>

        {showForm && (
          <Card className="border-accent/30 shadow-lg animate-in slide-in-from-top-2 duration-300">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-accent" /> {editingLead ? "Edit Lead" : "New Lead"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Owner Name *</Label>
                  <Input value={form.ownerName} onChange={e => setForm({ ...form, ownerName: e.target.value })} placeholder="John Doe" required />
                </div>
                <div className="space-y-2">
                  <Label>Business Name *</Label>
                  <Input value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} placeholder="Joe's Pizza" required />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 555-0123" required />
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Google Maps URL</Label>
                  <Input value={form.locationUrl} onChange={e => setForm({ ...form, locationUrl: e.target.value })} placeholder="https://maps.google.com/..." />
                </div>
                <div className="space-y-2">
                  <Label>City / Area</Label>
                  <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Downtown, NYC" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes..." rows={2} />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingLead ? "Update Lead" : "Save Lead")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold">Business</th>
                    <th className="text-left p-3 font-semibold hidden sm:table-cell">Phone</th>
                    <th className="text-left p-3 font-semibold hidden md:table-cell">Date Added</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted-foreground p-8">
                        {searchTerm ? `No leads found matching "${searchTerm}"` : "No leads yet. Click \"Add Lead\" to get started!"}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {searchTerm && (
                        <tr>
                          <td colSpan={4} className="text-center text-muted-foreground p-4 text-sm">
                            Found {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} matching "{searchTerm}"
                          </td>
                        </tr>
                      )}
                      {filteredLeads.map(lead => (
                        <tr key={lead.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-medium">{lead.businessName}</td>
                          <td className="p-3 hidden sm:table-cell text-muted-foreground">{lead.phone}</td>
                          <td className="p-3 hidden md:table-cell text-muted-foreground">{formatDate(lead.createdAt)}</td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(lead)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(lead.id)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default HunterDashboard;
