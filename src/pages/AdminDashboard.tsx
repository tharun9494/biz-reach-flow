import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Users, UserPlus, Shield, Trash2, Edit, Loader2, Search, Phone,
  TrendingUp, CheckCircle2, XCircle, Clock, BarChart3, Target, Award
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: "lead_hunter" | "caller" | "admin";
}

interface Lead {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  city: string;
  category: string;
  status: "pending" | "interested" | "rejected";
  addedBy: string;
  callerNote?: string;
  createdAt: any;
  updatedAt: any;
}

const CHART_COLORS = ["hsl(45, 93%, 47%)", "hsl(142, 71%, 45%)", "hsl(0, 84%, 60%)"];

const AdminDashboard = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<string>("caller");
  const [submitting, setSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editRole, setEditRole] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserRecord)));
      setLoading(false);
    });
    const unsubLeads = onSnapshot(collection(db, "leads"), (snap) => {
      setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lead)));
    });
    return () => { unsubUsers(); unsubLeads(); };
  }, []);

  // Computed stats
  const leadStats = useMemo(() => ({
    total: leads.length,
    pending: leads.filter((l) => l.status === "pending").length,
    interested: leads.filter((l) => l.status === "interested").length,
    rejected: leads.filter((l) => l.status === "rejected").length,
  }), [leads]);

  const conversionRate = useMemo(() => {
    if (leads.length === 0) return 0;
    return Math.round((leadStats.interested / leads.length) * 100);
  }, [leads, leadStats]);

  const completionRate = useMemo(() => {
    if (leads.length === 0) return 0;
    const worked = leadStats.interested + leadStats.rejected;
    return Math.round((worked / leads.length) * 100);
  }, [leads, leadStats]);

  // Team performance: hunters by leads added, callers by leads worked
  const hunterPerformance = useMemo(() => {
    const hunters = users.filter((u) => u.role === "lead_hunter");
    return hunters.map((h) => {
      const hunterLeads = leads.filter((l) => l.addedBy === h.id);
      return {
        name: h.name || h.email,
        total: hunterLeads.length,
        pending: hunterLeads.filter((l) => l.status === "pending").length,
        interested: hunterLeads.filter((l) => l.status === "interested").length,
        rejected: hunterLeads.filter((l) => l.status === "rejected").length,
      };
    }).sort((a, b) => b.total - a.total);
  }, [users, leads]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    leads.forEach((l) => { cats[l.category || "Other"] = (cats[l.category || "Other"] || 0) + 1; });
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [leads]);

  // City breakdown
  const cityData = useMemo(() => {
    const cities: Record<string, number> = {};
    leads.forEach((l) => { cities[l.city || "Unknown"] = (cities[l.city || "Unknown"] || 0) + 1; });
    return Object.entries(cities).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [leads]);

  const pieData = useMemo(() => [
    { name: "Pending", value: leadStats.pending },
    { name: "Interested", value: leadStats.interested },
    { name: "Rejected", value: leadStats.rejected },
  ], [leadStats]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword || !newName || !newRole) return;
    setSubmitting(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, newEmail, newPassword);
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid, email: newEmail, name: newName, role: newRole,
      });
      toast({ title: "User created", description: `${newName} added as ${newRole}` });
      setNewEmail(""); setNewName(""); setNewPassword(""); setNewRole("caller");
      setAddOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to create user", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const handleUpdateRole = async () => {
    if (!editingUser || !editRole) return;
    try {
      await updateDoc(doc(db, "users", editingUser.id), { role: editRole });
      toast({ title: "Role updated", description: `${editingUser.name} is now ${editRole}` });
      setEditingUser(null);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to update role", variant: "destructive" });
    }
  };

  const handleDeleteUser = async (user: UserRecord) => {
    if (!confirm(`Delete ${user.name}? This removes their Firestore record.`)) return;
    try {
      await deleteDoc(doc(db, "users", user.id));
      toast({ title: "User removed", description: `${user.name} has been removed` });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to delete", variant: "destructive" });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin": return <Badge className="bg-accent text-accent-foreground"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
      case "lead_hunter": return <Badge className="bg-primary text-primary-foreground"><Search className="h-3 w-3 mr-1" />Hunter</Badge>;
      case "caller": return <Badge variant="secondary"><Phone className="h-3 w-3 mr-1" />Caller</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm">Overview, analytics & team management</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <UserPlus className="h-4 w-4 mr-2" />Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-2"><Label>Name</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" required /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@agency.com" required /></div>
                <div className="space-y-2"><Label>Password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" required /></div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead_hunter">Lead Hunter</SelectItem>
                      <SelectItem value="caller">Caller</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create User"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Total Leads", value: leadStats.total, icon: BarChart3, color: "text-primary" },
            { label: "Pending", value: leadStats.pending, icon: Clock, color: "text-yellow-500" },
            { label: "Interested", value: leadStats.interested, icon: CheckCircle2, color: "text-green-500" },
            { label: "Rejected", value: leadStats.rejected, icon: XCircle, color: "text-red-500" },
            { label: "Conversion", value: `${conversionRate}%`, icon: TrendingUp, color: "text-accent" },
            { label: "Team Size", value: users.length, icon: Users, color: "text-primary" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <s.icon className={`h-7 w-7 ${s.color} opacity-70 shrink-0`} />
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Work Completion Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-accent" />
                <span className="font-semibold text-foreground">Work Completion</span>
              </div>
              <span className="text-sm text-muted-foreground">{leadStats.interested + leadStats.rejected} / {leadStats.total} leads processed</span>
            </div>
            <Progress value={completionRate} className="h-3" />
            <p className="text-xs text-muted-foreground mt-1">{completionRate}% of all leads have been reviewed by callers</p>
          </CardContent>
        </Card>

        <Tabs defaultValue="analytics" className="space-y-4">
          <TabsList>
            <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1" />Analytics</TabsTrigger>
            <TabsTrigger value="team"><Award className="h-4 w-4 mr-1" />Team Performance</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" />User Management</TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Status Pie */}
              <Card>
                <CardHeader><CardTitle className="text-base">Lead Status Distribution</CardTitle></CardHeader>
                <CardContent>
                  {leads.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No leads yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Category Bar */}
              <Card>
                <CardHeader><CardTitle className="text-base">Leads by Category</CardTitle></CardHeader>
                <CardContent>
                  {categoryData.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={categoryData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                        <Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* City Bar */}
              <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-base">Leads by City / Area</CardTitle></CardHeader>
                <CardContent>
                  {cityData.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={cityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Team Performance Tab */}
          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-accent" />Lead Hunter Performance</CardTitle></CardHeader>
              <CardContent>
                {hunterPerformance.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No lead hunters found</p>
                ) : (
                  <div className="space-y-4">
                    {hunterPerformance.map((h, i) => (
                      <div key={h.name} className="border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {i === 0 && <Award className="h-5 w-5 text-yellow-500" />}
                            <span className="font-semibold text-foreground">{h.name}</span>
                          </div>
                          <Badge variant="outline">{h.total} leads</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="bg-yellow-500/10 rounded-md p-2">
                            <p className="text-lg font-bold text-yellow-500">{h.pending}</p>
                            <p className="text-xs text-muted-foreground">Pending</p>
                          </div>
                          <div className="bg-green-500/10 rounded-md p-2">
                            <p className="text-lg font-bold text-green-500">{h.interested}</p>
                            <p className="text-xs text-muted-foreground">Interested</p>
                          </div>
                          <div className="bg-red-500/10 rounded-md p-2">
                            <p className="text-lg font-bold text-red-500">{h.rejected}</p>
                            <p className="text-xs text-muted-foreground">Rejected</p>
                          </div>
                        </div>
                        {h.total > 0 && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Conversion rate</span>
                              <span>{Math.round((h.interested / h.total) * 100)}%</span>
                            </div>
                            <Progress value={Math.round((h.interested / h.total) * 100)} className="h-2" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Leads Table */}
            <Card>
              <CardHeader><CardTitle className="text-base">All Leads Overview</CardTitle></CardHeader>
              <CardContent>
                {leads.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No leads yet</p>
                ) : (
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Business</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Added By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leads.map((l) => {
                          const addedByUser = users.find((u) => u.id === l.addedBy);
                          return (
                            <TableRow key={l.id}>
                              <TableCell className="font-medium">{l.businessName}</TableCell>
                              <TableCell>{l.ownerName}</TableCell>
                              <TableCell>{l.city}</TableCell>
                              <TableCell><Badge variant="outline">{l.category}</Badge></TableCell>
                              <TableCell>
                                <Badge className={
                                  l.status === "pending" ? "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" :
                                  l.status === "interested" ? "bg-green-500/20 text-green-600 border-green-500/30" :
                                  "bg-red-500/20 text-red-600 border-red-500/30"
                                }>{l.status}</Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">{addedByUser?.name || "Unknown"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />User Management</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
                ) : users.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No users found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{getRoleBadge(u.role)}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" onClick={() => { setEditingUser(u); setEditRole(u.role); }}>
                              <Edit className="h-3 w-3 mr-1" />Role
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(u)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Role Dialog */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Change Role — {editingUser?.name}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead_hunter">Lead Hunter</SelectItem>
                  <SelectItem value="caller">Caller</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleUpdateRole}>Save Role</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
