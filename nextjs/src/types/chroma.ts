import { z } from "zod";
import { Metadata } from "chromadb"

export interface UnifiedDocument {
    source: string;
    document_key: string;
    version_key: string;
    content: string;
    metadata: Record<string, any>;
}

export interface ChromaChunks {
    ids: string[];
    documents: string[];
    metadatas: Metadata[];
}

export interface ChromaCredentials {
  apiKey: string;
  databaseName: string;
  tenantUuid: string;
}

export const chromaDocumentMetadataSchema = z.object({
  source: z.string(),
  document_key: z.string(),
});

export const chromaSyncDocumentMetadataSchema = z.object({
  chunk_strategy: z
    .union([z.enum(["tree_sitter", "lines"]), z.string()])
    .optional(),
  document_key: z.string(),
  document_key_sha256: z.string(),
  end_col: z.number().optional(),
  end_line: z.number().optional(),
  language: z.string().optional(),
  start_col: z.number().optional(),
  start_line: z.number().optional(),
  version_key: z.string(),
  version_key_sha256: z.string(),
});

export interface SlackMessageRecord {
  id: string;
  ts: string;
  channel_id: string;
  thread_ts: string | null;
  app_id: string | null;
  bot_id: string | null;
  display_as_bot: boolean | null;
  is_locked: boolean | null;
  metadata: {
    event_type: string;
  };
  parent_user_id: string | null;
  subtype: string | null;
  text: string;
  topic: string | null;
  user_id: string;
  raw_json: string;
  _nango_metadata: {
    first_seen_at: string;
    last_modified_at: string;
    last_action: string;
    deleted_at: string | null;
    pruned_at: string | null;
    cursor: string;
  };
}

export interface GithubIssueRecord {
  id: string;
  owner: string;
  repo: string;
  issue_number: number;
  title: string;
  state: string;
  author: string;
  author_id: number;
  body: string | null;
  date_created: string;
  date_last_modified: string;
  _nango_metadata: {
    first_seen_at: string;
    last_modified_at: string;
    last_action: string;
    deleted_at: string | null;
    pruned_at: string | null;
    cursor: string;
  };
}