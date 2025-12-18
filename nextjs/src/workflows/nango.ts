import { UnifiedDocument, SlackMessageRecord, GithubIssueRecord } from "@/types/chroma";
import { NangoWebhookBody, NangoAuthWebhookBody, NangoSyncWebhookBody, NangoAuthWebhookBodySuccess, NangoSyncWebhookBodySuccess } from "@/types/nango";
import { getUserCredentials, ingest } from "./chroma";
import { FatalError } from "workflow";
import { db } from "@/index";
import { users, userConnections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Nango } from "@nangohq/node";
import { Where } from "chromadb";
import type { ChromaCredentials } from "@/types/chroma";
import { getCollection } from "@/lib/chroma";

export async function processNangoWebhook(payload: NangoWebhookBody) {
    "use workflow";

    const { type } = payload;

    if (type === "auth") {
        await processNangoAuthWebhook(payload as NangoAuthWebhookBody);
    } else if (type === "sync") {
        await processNangoSyncWebhook(payload as NangoSyncWebhookBody);
    }
}

export async function processNangoAuthWebhook(payload: NangoAuthWebhookBody) {
    "use step";

    if (!payload.success) {
        return;
    }

    const successPayload = payload as NangoAuthWebhookBodySuccess;

    if (!successPayload.endUser) {
        throw new FatalError("End user information not found in webhook");
    }

    const { endUserId } = successPayload.endUser;

    const user = await db
        .select()
        .from(users)
        .where(eq(users.id, endUserId))
        .limit(1)
        .then((rows) => rows[0] ?? null);

    if (!user) {
        throw new FatalError("User not found - user must sign up first");
    }

    await db
        .insert(userConnections)
        .values({
            userId: user.id,
            connectionId: successPayload.connectionId,
            providerConfigKey: successPayload.providerConfigKey,
        })
        .onConflictDoUpdate({
            target: [userConnections.userId, userConnections.providerConfigKey],
            set: {
                connectionId: successPayload.connectionId,
                updatedAt: new Date(),
            },
        });
}

export async function processNangoSyncWebhook(payload: NangoSyncWebhookBody) {
    "use workflow";

    if (!payload.success) {
        return;
    }

    const successPayload = payload as NangoSyncWebhookBodySuccess;
    const { connectionId, providerConfigKey, model, modifiedAfter } = successPayload;

    const records = await getNangoRecords(connectionId, providerConfigKey, model);

    const credentials = await getUserCredentials(connectionId);
    if (!credentials) {
        throw new FatalError("Credentials not found");
    }

    const unifiedDocuments: UnifiedDocument[] = [];
    const documentKeysToDelete: string[] = [];

    for (const record of records) {
        const nangoMetadata = record._nango_metadata;

        if (!nangoMetadata) {
            throw new FatalError("Nango metadata not found");
        }

        const isDeleted = nangoMetadata.deleted_at != null;

        const unifiedDoc = transformToUnifiedDocument(model, record, connectionId, providerConfigKey);
        if (!unifiedDoc) {
            continue;
        }

        if (isDeleted) {
            documentKeysToDelete.push(unifiedDoc.document_key);
        } else {
            unifiedDocuments.push(unifiedDoc);
        }
    }

    if (documentKeysToDelete.length > 0) {
        await deleteDocumentsFromChroma(documentKeysToDelete, credentials);
    }

    if (unifiedDocuments.length > 0) {
        await ingest(unifiedDocuments, credentials);
    }
}

async function getNangoRecords(connectionId: string, providerConfigKey: string, model: string) {
    "use step";

    const nango = new Nango({ secretKey: process.env.NANGO_SECRET_KEY! });
    const response = await nango.listRecords({
        connectionId,
        providerConfigKey,
        model,
        limit: 1000,
    });

    return response.records;
}

async function deleteDocumentsFromChroma(documentKeys: string[], credentials: ChromaCredentials) {
    "use step";

    const collection = await getCollection(credentials, "default");

    const batchSize = 4;
    const batches: string[][] = [];
    for (let i = 0; i < documentKeys.length; i += batchSize) {
        batches.push(documentKeys.slice(i, i + batchSize));
    }

    for (const batch of batches) {
        const where: Where = {
            $or: batch.map(key => ({
                document_key: key,
            })),
        } as Where;

        await collection.delete({ where });
    }
}

function transformToUnifiedDocument(model: string, record: any, connectionId: string, providerConfigKey: string): UnifiedDocument | null {
    const source = providerConfigKey;
    const documentKey = String(record.id);
    
    // Use last_modified_at from _nango_metadata for version key, or fallback to record-specific timestamps
    let lastModified: number;
    if (record._nango_metadata?.last_modified_at) {
        lastModified = new Date(record._nango_metadata.last_modified_at).getTime();
    } else if (record.date_last_modified) {
        lastModified = new Date(record.date_last_modified).getTime();
    } else if (record.ts) {
        lastModified = parseFloat(record.ts) * 1000;
    } else {
        lastModified = Date.now();
    }
    const versionKey = `${documentKey}::${lastModified}`;

    let content = "";
    let metadata: Record<string, any> = {
        source,
        document_key: documentKey,
        version_key: versionKey,
    };

    // Handle GitHub issues
    if (model === "GithubIssue" || model.includes("Issue")) {
        const issueRecord = record as GithubIssueRecord;
        content = issueRecord.body || issueRecord.title || "";
        metadata = {
            ...metadata,
            type: "github_issue",
            owner: issueRecord.owner,
            repo: issueRecord.repo,
            issue_number: issueRecord.issue_number,
            title: issueRecord.title,
            state: issueRecord.state,
            author: issueRecord.author,
            author_id: issueRecord.author_id,
            date_created: issueRecord.date_created,
            date_last_modified: issueRecord.date_last_modified,
        };
    } else if (model.includes("Slack") || model.includes("Message")) {
        const slackRecord = record as SlackMessageRecord;
        content = slackRecord.text || "";
        metadata = {
            ...metadata,
            type: "slack_message",
            channel_id: slackRecord.channel_id,
            thread_ts: slackRecord.thread_ts,
            user_id: slackRecord.user_id,
            ts: slackRecord.ts,
            subtype: slackRecord.subtype,
            app_id: slackRecord.app_id,
            bot_id: slackRecord.bot_id,
        };
    } else if (model === "SlackMessageReaction" || model.includes("Contact")) {
        content = record.fullName || record.name || "";
        metadata = {
            ...metadata,
            type: "contact",
            fullName: record.fullName || record.name,
            avatar: record.avatar,
        };
    } else if (model.includes("File") || model.includes("Drive")) {
        content = record.title || record.name || "";
        metadata = {
            ...metadata,
            type: "file",
            title: record.title || record.name,
            mimeType: record.mimeType || record.mime_type,
            url: record.url,
            size: record.size,
        };
    } else {
        return null;
    }

    return {
        source,
        document_key: documentKey,
        version_key: versionKey,
        content,
        metadata,
    };
}