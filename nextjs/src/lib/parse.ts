export function parseChromaCode(code: string): {
  apiKey: string | null;
  tenantUuid: string | null;
  databaseName: string | null;
} {
  const result = {
    apiKey: null as string | null,
    tenantUuid: null as string | null,
    databaseName: null as string | null,
  };

  // Extract api_key
  const apiKeyMatch = code.match(/api_key=['"]([^'"]+)['"]/);
  if (apiKeyMatch) {
    result.apiKey = apiKeyMatch[1];
  }

  // Extract tenant
  const tenantMatch = code.match(/tenant=['"]([^'"]+)['"]/);
  if (tenantMatch) {
    result.tenantUuid = tenantMatch[1];
  }

  // Extract database
  const databaseMatch = code.match(/database=['"]([^'"]+)['"]/);
  if (databaseMatch) {
    result.databaseName = databaseMatch[1];
  }

  return result;
}
