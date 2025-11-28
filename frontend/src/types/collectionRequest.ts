export type CollectionRequestStatus =
  | "PENDING"
  | "REFUSED"
  | "SCHEDULED"
  | "CANCELLED"
  | "COMPLETED";

export interface CollectionRequest {
  id: number;
  status: CollectionRequestStatus;
  requestedAt: string;
  scheduledDate: string | null;
  user: { id: number; name?: string; email?: string };
  company: { id: number; name: string };
}
