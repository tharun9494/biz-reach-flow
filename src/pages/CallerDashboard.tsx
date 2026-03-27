import { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, query, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Phone, MapPin, Tag, Clock, User, Building2, MessageSquare,
  ThumbsUp, ThumbsDown, RotateCcw, ExternalLink, Download, StickyNote,
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

const CallerDashboard = () => {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [callerNotes, setCallerNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
      setLeads(data);
      // Initialize caller notes from existing data
      const notes: Record<string, string> = {};
      data.forEach(l => { notes[l.id] = l.callerNote || ""; });
      setCallerNotes(prev => ({ ...notes, ...prev }));
    });
    return unsub;
  }, []);

  const updateStatus = async (leadId: string, status: string) => {
    try {
      await updateDoc(doc(db, "leads", leadId), { status, updatedAt: Timestamp.now() });
      toast({ title: "Status updated", description: `Lead marked as ${status}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const saveCallerNote = async (leadId: string) => {
    try {
      await updateDoc(doc(db, "leads", leadId), {
        callerNote: callerNotes[leadId] || "",
        updatedAt: Timestamp.now(),
      });
      toast({ title: "Note saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const filtered = filter === "all" ? leads : leads.filter(l => l.status === filter);

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
            <p className="text-sm text-muted-foreground">Review and update lead statuses</p>
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

        {/* Lead Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.length === 0 ? (
            <div className="md:col-span-2 text-center text-muted-foreground py-12">
              No leads found for this filter.
            </div>
          ) : filtered.map(lead => (
            <Card key={lead.id} className="border-border hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-accent" />
                      {lead.businessName}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <User className="h-3 w-3" /> {lead.ownerName}
                    </p>
                  </div>
                  {statusBadge(lead.status)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <a href={`tel:${lead.phone}`} className="hover:text-accent transition-colors">{lead.phone}</a>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Tag className="h-3.5 w-3.5" /> {lead.category}
                  </div>
                  {lead.city && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {lead.city}
                    </div>
                  )}
                  {lead.locationUrl && (
                    <a href={lead.locationUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-accent hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" /> View on Maps
                    </a>
                  )}
                </div>

                {lead.notes && (
                  <div className="text-sm bg-muted/50 rounded-md p-2.5 flex gap-2">
                    <StickyNote className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{lead.notes}</span>
                  </div>
                )}

                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Added: {formatDate(lead.createdAt)}
                  {lead.updatedAt && lead.updatedAt !== lead.createdAt && (
                    <span className="ml-2">• Updated: {formatDate(lead.updatedAt)}</span>
                  )}
                </div>

                {/* Caller Note */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MessageSquare className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Add feedback note..."
                      value={callerNotes[lead.id] || ""}
                      onChange={e => setCallerNotes(prev => ({ ...prev, [lead.id]: e.target.value }))}
                      className="pl-8 text-sm h-9"
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => saveCallerNote(lead.id)} className="h-9">
                    Save
                  </Button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => updateStatus(lead.id, "interested")}
                    disabled={lead.status === "interested"}
                    className="bg-emerald-500 hover:bg-emerald-600 text-primary-foreground text-xs"
                  >
                    <ThumbsUp className="h-3.5 w-3.5 mr-1" /> Interested
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateStatus(lead.id, "rejected")}
                    disabled={lead.status === "rejected"}
                    className="bg-red-500 hover:bg-red-600 text-primary-foreground text-xs"
                  >
                    <ThumbsDown className="h-3.5 w-3.5 mr-1" /> Rejected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(lead.id, "pending")}
                    disabled={lead.status === "pending"}
                    className="text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CallerDashboard;
