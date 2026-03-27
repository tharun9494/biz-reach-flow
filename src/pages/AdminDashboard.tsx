import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Shield, Trash2, Edit, Loader2, Search, Phone } from "lucide-react";

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: "lead_hunter" | "caller" | "admin";
}

interface LeadStats {
  total: number;
  pending: number;
  interested: number;
  rejected: number;
}

const AdminDashboard = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [leadStats, setLeadStats] = useState<LeadStats>({ total: 0, pending: 0, interested: 0, rejected: 0 });
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
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const list: UserRecord[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserRecord));
      setUsers(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "leads"), (snap) => {
      const leads = snap.docs.map((d) => d.data());
      setLeadStats({
        total: leads.length,
        pending: leads.filter((l) => l.status === "pending").length,
        interested: leads.filter((l) => l.status === "interested").length,
        rejected: leads.filter((l) => l.status === "rejected").length,
      });
    });
    return unsub;
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword || !newName || !newRole) return;
    setSubmitting(true);
    try {
      // Note: Creating users from admin requires Firebase Admin SDK ideally.
      // For client-side, we create the user doc in Firestore directly.
      // The user must be created in Firebase Auth separately (or use this approach with re-auth).
      const cred = await createUserWithEmailAndPassword(auth, newEmail, newPassword);
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        email: newEmail,
        name: newName,
        role: newRole,
      });
      toast({ title: "User created", description: `${newName} added as ${newRole}` });
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRole("caller");
      setAddOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to create user", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
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
      case "admin":
        return <Badge className="bg-[hsl(var(--accent))] text-accent-foreground"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
      case "lead_hunter":
        return <Badge className="bg-primary text-primary-foreground"><Search className="h-3 w-3 mr-1" />Lead Hunter</Badge>;
      case "caller":
        return <Badge variant="secondary"><Phone className="h-3 w-3 mr-1" />Caller</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const statCards = [
    { label: "Total Users", value: users.length, icon: Users, color: "text-primary" },
    { label: "Total Leads", value: leadStats.total, icon: Shield, color: "text-[hsl(var(--accent))]" },
    { label: "Pending", value: leadStats.pending, icon: Shield, color: "text-[hsl(var(--status-pending))]" },
    { label: "Interested", value: leadStats.interested, icon: Shield, color: "text-[hsl(var(--status-interested))]" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm">Manage users, roles & overview</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@agency.com" required />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" required />
                </div>
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                  <s.icon className={`h-8 w-8 ${s.color} opacity-30`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />User Management</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No users found. Add your first user above.</p>
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setEditingUser(u); setEditRole(u.role); }}
                        >
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

        {/* Edit Role Dialog */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Role — {editingUser?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead_hunter">Lead Hunter</SelectItem>
                  <SelectItem value="caller">Caller</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleUpdateRole}>
                Save Role
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
