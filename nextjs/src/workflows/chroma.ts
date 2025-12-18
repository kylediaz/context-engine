import { userChromaCredentials, userConnections } from "@/db/schema";
import { db } from "@/lib/db";
import { ChromaChunks, ChromaCredentials, UnifiedDocument } from "@/types/chroma";
import { Where } from "chromadb";
import { eq } from "drizzle-orm";
import { getCollection } from "@/lib/chroma";

export const getUserCredentials = async (connectionId: string): Promise<ChromaCredentials> => {
    "use step";

    const credentials = await db.select({
        apiKey: userChromaCredentials.apiKey,
        databaseName: userChromaCredentials.databaseName,
        tenantUuid: userChromaCredentials.tenantUuid,
    })
        .from(userConnections)
        .where(eq(userConnections.connectionId, connectionId))
        .innerJoin(userChromaCredentials, eq(userConnections.userId, userChromaCredentials.userId))
        .limit(1)
        .then(rows => rows[0] ?? null);

    return credentials || null;
}

export async function ingest(documents: UnifiedDocument[], credentials: ChromaCredentials) {
    "use workflow";

    const batches = await unifiedDocumentsToChromaChunks(documents);

    for (const batch of batches) {
        await upsertChromaChunks(batch, credentials);
    }

    await deleteChromaChunks(documents, credentials);
}

async function unifiedDocumentsToChromaChunks(documents: UnifiedDocument[]): Promise<ChromaChunks[]> {
    "use step";

    const chunkedBatches = chunkDocuments(documents);
    
    const allChunks: ChromaChunks = {
        ids: [],
        documents: [],
        metadatas: [],
    };

    for (const batch of chunkedBatches) {
        allChunks.ids.push(...batch.ids);
        allChunks.documents.push(...batch.documents);
        allChunks.metadatas.push(...batch.metadatas);
    }

    const batches = batchChromaChunks(allChunks);

    return batches;
}

export const chunkDocuments = (documents: UnifiedDocument[], batchSize: number = 300): ChromaChunks[] => {
    const chunks: ChromaChunks[] = [];
    const chunkSize = 800;

    for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        const batchIds: string[] = [];
        const batchDocuments: string[] = [];
        const batchMetadatas: Record<string, any>[] = [];

        for (const document of batch) {
            const content = document.content;
            
            if (content.length <= chunkSize) {
                batchIds.push(`${document.source}::${document.document_key}::0`);
                batchDocuments.push(content);
                batchMetadatas.push({
                    ...document.metadata,
                    chunk_index: 0,
                    total_chunks: 1,
                });
            } else {
                const contentChunks: string[] = [];
                for (let j = 0; j < content.length; j += chunkSize) {
                    contentChunks.push(content.slice(j, j + chunkSize));
                }

                contentChunks.forEach((chunk, chunkIndex) => {
                    batchIds.push(`${document.source}::${document.document_key}::${chunkIndex}`);
                    batchDocuments.push(chunk);
                    batchMetadatas.push({
                        ...document.metadata,
                        chunk_index: chunkIndex,
                        total_chunks: contentChunks.length,
                    });
                });
            }
        }

        chunks.push({
            ids: batchIds,
            documents: batchDocuments,
            metadatas: batchMetadatas,
        });
    }

    return chunks;
}

export function batchChromaChunks(chunks: ChromaChunks, batchSize: number = 100): ChromaChunks[] {
    const batches: ChromaChunks[] = [];

    for (let i = 0; i < chunks.ids.length; i += batchSize) {
        batches.push({
            ids: chunks.ids.slice(i, i + batchSize),
            documents: chunks.documents.slice(i, i + batchSize),
            metadatas: chunks.metadatas.slice(i, i + batchSize),
        });
    }

    return batches;
}

export async function upsertChromaChunks(chunks: ChromaChunks, credentials: ChromaCredentials) {
    "use step";

    const collection = await getCollection(credentials, "default");

    await collection.upsert(chunks);
}

export async function deleteChromaChunks(documents: UnifiedDocument[], credentials: ChromaCredentials) {
    "use step";

    const collection = await getCollection(credentials, "default");

    const wheres = createWhereClauses(documents);

    for (const where of wheres) {
        await collection.delete({ where });
    }
}

/**
 * Selects out of date document chunks for deletion
 * @param documents 
 * @param maxPredicates 
 */
export function createWhereClauses(documents: UnifiedDocument[], maxPredicates: number = 8): Where[] {
    let wheres: Where[] = documents.map(document => ({
        $and: [
            {
                document_key: document.document_key,
            },
            {
                version_key: {
                    $ne: document.version_key,
                }
            }
        ],
    } as Where));

    const batchSize = Math.floor(maxPredicates / 2);

    const batchedWheres: Where[][] = [];
    for (let i = 0; i < wheres.length; i += batchSize) {
        batchedWheres.push(wheres.slice(i, i + batchSize));
    }

    if (batchedWheres.length == 1) {
        return wheres;
    }

    wheres = batchedWheres.map(batch => ({
        $or: batch,
    } as Where));

    return wheres;
}