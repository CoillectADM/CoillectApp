import api from "../../api/axios";
import companyApi from "../../api/companyAxios";
import type { CollectionRequest } from "../../types/collectionRequest";

export async function getMyActiveRequest(): Promise<CollectionRequest | null> {
  const res = await api.get("/collection-request/my-active");
  return res.data.data ?? null;
}

export async function createCollectionRequest(
  companyId: number
): Promise<CollectionRequest> {
  const res = await api.post("/collection-request", { companyId });
  return res.data.data;
}

export async function cancelCollectionRequest(
  requestId: number
): Promise<CollectionRequest> {
  const res = await api.post(`/collection-request/${requestId}/cancel`);
  return res.data.data;
}

export async function completeCollectionRequest(
  requestId: number
): Promise<CollectionRequest> {
  const res = await api.post(`/collection-request/${requestId}/complete`);
  return res.data.data;
}

// HISTÓRICO DO USUÁRIO (usa token de usuário)
export async function getMyHistory(): Promise<CollectionRequest[]> {
  const res = await api.get("/collection-request/my-history");
  return res.data.data ?? [];
}

// HISTÓRICO DA EMPRESA (usa token da empresa)
export async function getCompanyHistory(): Promise<CollectionRequest[]> {
  const res = await companyApi.get("/collection-request/company/history");
  return res.data.data ?? [];
}
