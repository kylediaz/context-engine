import { getCollection } from "@/lib/chroma";
import { ChromaCredentials } from "@/types/chroma";

export interface QueryResult {
  id: string;
  distance?: number | null;
  metadata: Record<string, any>;
  document: string;
}

export async function queryCollection(
  credentials: ChromaCredentials,
  collectionName: string,
  queryText: string,
  nResults: number = 10,
): Promise<QueryResult[]> {
  const collection = await getCollection(credentials, collectionName);

  const results = await collection.query({
    queryTexts: [queryText],
    nResults,
  });

  if (!results.ids?.[0]) return [];

  const parsed: QueryResult[] = [];

  for (let i = 0; i < results.ids[0].length; i++) {
    const id = results.ids[0][i];
    const rawMetadata = results.metadatas?.[0]?.[i];
    const document = results.documents?.[0]?.[i];
    const distance = results.distances?.[0]?.[i];

    if (!rawMetadata || !document) continue;

    parsed.push({
      id,
      distance: distance ?? null,
      metadata: rawMetadata,
      document,
    });
  }

  return parsed;
}

