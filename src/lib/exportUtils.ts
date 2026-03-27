import jsPDF from "jspdf";
import "jspdf-autotable";

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
  callerNote?: string;
  createdAt: any;
}

const formatDate = (ts: any) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export const exportLeadsToCSV = (leads: Lead[]) => {
  const headers = ["Business Name", "Owner Name", "Phone", "City", "Category", "Status", "Notes", "Caller Note", "Date Added"];
  const rows = leads.map(l => [
    l.businessName, l.ownerName, l.phone, l.city, l.category, l.status, l.notes || "", (l as any).callerNote || "", formatDate(l.createdAt),
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${(c || "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads_report_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportLeadsToPDF = (leads: Lead[], title: string) => {
  const pdf = new jsPDF({ orientation: "landscape" });
  pdf.setFontSize(18);
  pdf.text(title, 14, 20);
  pdf.setFontSize(10);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

  const headers = [["Business", "Owner", "Phone", "City", "Category", "Status", "Notes", "Caller Note", "Date"]];
  const body = leads.map(l => [
    l.businessName, l.ownerName, l.phone, l.city, l.category, l.status, l.notes || "", (l as any).callerNote || "", formatDate(l.createdAt),
  ]);

  (pdf as any).autoTable({
    head: headers,
    body,
    startY: 34,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [241, 245, 249] },
  });

  pdf.save(`leads_report_${new Date().toISOString().slice(0, 10)}.pdf`);
};
