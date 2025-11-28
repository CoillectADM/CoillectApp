// src/services/api/collectionRequestCompanyApi.ts
import companyApi from "../../api/companyAxios";
import type { CollectionRequest } from "../../types/collectionRequest";

export async function getCompanyActiveRequests(): Promise<CollectionRequest[]> {
  const res = await companyApi.get("/collection-request/company/active");
  return res.data.data || [];
}

export async function acceptRequest(id: number): Promise<CollectionRequest> {
  const res = await companyApi.post(`/collection-request/${id}/accept`);
  return res.data.data;
}

export async function refuseRequest(id: number): Promise<CollectionRequest> {
  const res = await companyApi.post(`/collection-request/${id}/refuse`);
  return res.data.data;
}
