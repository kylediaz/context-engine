import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  streamText,
  tool as createTool,
  stepCountIs,
} from "ai";
import type { UIMessage } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getChromaCredentials } from "@/app/actions/chroma";
import { getUser } from "@/lib/dal";
import { queryCollection } from "@/lib/chroma-query";

const MAX_SEARCH_RESULTS = 7;
const MAX_TOOL_STEPS = 20;
const COLLECTION_NAME = "default";

export const maxDuration = 30;

function sortByRelevance(results: Array<{ path: string; content: string }>) {
  return results.sort((a, b) => {
    const aChunks = a.content.split("...").length;
    const bChunks = b.content.split("...").length;
    return bChunks - aChunks;
  });
}

function groupResultsByPath(results: Array<{ metadata: Record<string, any>; document: string }>) {
  const grouped = new Map<string, string[]>();

  for (const result of results) {
    const path = result.metadata?.document_key || "unknown";
    if (!grouped.has(path)) {
      grouped.set(path, []);
    }
    grouped.get(path)!.push(result.document);
  }

  return Array.from(grouped.entries()).map(([path, chunks]) => ({
    path,
    content: chunks.join("..."),
  }));
}

function createSearchTool(credentials: any) {
  return createTool({
    description:
      "Semantic search for documents in your Chroma collection using natural language.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("Natural language query to search for relevant documents"),
    }),
    execute: async ({ query }: { query: string }) => {
      const results = await queryCollection(
        credentials,
        COLLECTION_NAME,
        query,
        MAX_SEARCH_RESULTS,
      );
      
      const grouped = groupResultsByPath(results);
      const sorted = sortByRelevance(grouped);
      
      return { results: sorted };
    },
  });
}

function buildSystemPrompt(): string {
  return `You are a helpful AI assistant that helps users search and understand documents stored in their Chroma collection.

You have access to a search tool to find relevant documents. Use this tool to provide accurate, context-aware answers.

Keep your answers concise and focused on the user's question.

The user cannot see the results of the tools you use, so if they want to see something, you must restate it.

Use markdown to format your responses. Use \`\`\`code blocks\`\`\` and inline code \`code\` to make your output more readable.

You can make at most 5 searches each time the user asks a question. Use parallel tool calling to make multiple searches at once. Try to answer the question before hand. If you can't find the answer after 5 searches, succinctly describe what you've found.`;
}

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const credentials = await getChromaCredentials();
    if (!credentials) {
      return NextResponse.json(
        { error: "Chroma credentials not configured. Please set your credentials in the dashboard." },
        { status: 400 },
      );
    }

    const { messages }: { messages: UIMessage[] } = await req.json();

    const result = streamText({
      model: openai("gpt-4o"),
      system: buildSystemPrompt(),
      messages: convertToModelMessages(messages),
      tools: {
        search: createSearchTool({
          apiKey: credentials.apiKey,
          tenantUuid: credentials.tenantUuid,
          databaseName: credentials.databaseName,
        }),
      },
      stopWhen: stepCountIs(MAX_TOOL_STEPS),
    });

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      onError: (error: unknown) => {
        console.error("Chat error:", error);
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return `An error occurred: ${message}`;
      },
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

