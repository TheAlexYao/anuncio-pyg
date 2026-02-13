const META_GRAPH_BASE = "https://graph.facebook.com/v21.0";

export type MetaPage = {
  id: string;
  name: string;
};

export type MetaLeadForm = {
  id: string;
  name: string;
  status: string;
};

export type MetaLead = {
  id: string;
  created_time: string;
  field_data: Array<{ name: string; values: string[] }>;
};

type MetaErrorResponse = {
  error: {
    message: string;
    type: string;
    code: number;
  };
};

function isMetaError(body: unknown): body is MetaErrorResponse {
  return (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as MetaErrorResponse).error?.message === "string"
  );
}

async function metaGet<T>(url: string, accessToken: string): Promise<T> {
  const separator = url.includes("?") ? "&" : "?";
  const fullUrl = `${url}${separator}access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(fullUrl);
  const body = await res.json();
  if (!res.ok || isMetaError(body)) {
    const msg = isMetaError(body)
      ? `Meta API error (${body.error.code}): ${body.error.message}`
      : `Meta API request failed with status ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

export async function getPages(accessToken: string): Promise<MetaPage[]> {
  const result = await metaGet<{ data: MetaPage[] }>(
    `${META_GRAPH_BASE}/me/accounts?fields=id,name`,
    accessToken
  );
  return result.data;
}

export async function getLeadForms(
  accessToken: string,
  pageId: string
): Promise<MetaLeadForm[]> {
  const result = await metaGet<{ data: MetaLeadForm[] }>(
    `${META_GRAPH_BASE}/${pageId}/leadgen_forms?fields=id,name,status`,
    accessToken
  );
  return result.data;
}

export async function getLeadsByForm(
  accessToken: string,
  formId: string,
  since?: number
): Promise<MetaLead[]> {
  let url = `${META_GRAPH_BASE}/${formId}/leads?fields=id,created_time,field_data`;
  if (since !== undefined) {
    url += `&filtering=[{"field":"time_created","operator":"GREATER_THAN","value":${since}}]`;
  }
  const result = await metaGet<{ data: MetaLead[] }>(url, accessToken);
  return result.data;
}

// Exported for testing
export { META_GRAPH_BASE, metaGet };
