export type Role = "admin" | "technician" | "supervisor" | "reporter";

export type User = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  token: string;
};

export type Asset = {
  _id: string;
  name: string;
  assetCode: string;
  category?: string;
  location?: string;
  condition: "Good" | "Fair" | "Poor" | "Unsafe";
  status:
    | "Operational"
    | "Issue Reported"
    | "Under Inspection"
    | "Under Maintenance"
    | "Out of Service"
    | "Retired";
  lastServiceDate?: string;
  nextServiceDate?: string;
  assignedTechnician?: { _id: string; fullName: string; email: string } | null;
  qrCodeUrl?: string;
  publicUrl?: string;
  createdAt: string;
};

export type Issue = {
  _id: string;
  issueNumber: string;
  asset: { _id: string; name: string; assetCode: string; location?: string };
  title: string;
  description: string;
  category?: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status:
    | "Reported"
    | "Assigned"
    | "Inspection Started"
    | "Maintenance In Progress"
    | "Waiting for Parts"
    | "Resolved"
    | "Closed"
    | "Reopened";
  isCritical: boolean;
  reporterName?: string;
  reporterContact?: string;
  assignedTechnician?: { _id: string; fullName: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
};
