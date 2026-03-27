import { useState, useEffect } from "react";
import { collection, addDoc, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
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
import { Plus, Building2, Loader2, Download } from "lucide-react";
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
}

const categories = ["Restaurant", "Shop", "Salon", "Hotel", "Other"];

const HunterDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    businessName: "", ownerName: "", phone: "", locationUrl: "", city: "", category: "", notes: "",
  });

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "leads"),
      where("addedBy", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead)));
    });
    return unsub;
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim() || !form.phone.trim() || !form.category) {
      toast({ title: "Missing fields", description: "Fill in required fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "leads"), {
        ...form,
        status: "pending",
        callerNote: "",
        addedBy: user!.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      setForm({ businessName: "", ownerName: "", phone: "", locationUrl: "", city: "", category: "", notes: "" });
      setShowForm(false);
      toast({ title: "Lead added!", description: `${form.businessName} saved successfully.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    const cls = status === "pending" ? "status-pending" : status === "interested" ? "status-interested" : "status-rejected";
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Lead Hunter Dashboard</h2>
            <p className="text-sm text-muted-foreground">Find businesses and add them as leads</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportLeadsToCSV(leads)}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportLeadsToPDF(leads, "My Leads Report")}>
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
                <Building2 className="h-5 w-5 text-accent" /> New Lead
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
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Lead"}
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
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold hidden md:table-cell">Date Added</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted-foreground p-8">
                        No leads yet. Click "Add Lead" to get started!
                      </td>
                    </tr>
                  ) : leads.map(lead => (
                    <tr key={lead.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{lead.businessName}</td>
                      <td className="p-3 hidden sm:table-cell text-muted-foreground">{lead.phone}</td>
                      <td className="p-3">{statusBadge(lead.status)}</td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">{formatDate(lead.createdAt)}</td>
                    </tr>
                  ))}
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
