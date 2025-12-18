"use client";

import { ReactNode, useState } from "react";
import { UIMessage, UIMessagePart, UIDataTypes, UITools } from "ai";
import { motion } from "framer-motion";
import { MemoizedMarkdown } from "@/components/chat/memoized-markdown";
import { AnimatedEllipsis, AnimatedNumber } from "@/components/shared/misc";

export interface MessageProps {
  message: UIMessage;
}

function UserMessage({ message }: { message: UIMessage }) {
  return (
    <div className="min-w-[4ch] rounded-md border border-border bg-secondary px-3 py-2 mt-8">
      {message.parts.map((part, index) =>
        part.type === "text" ? (
          <MemoizedMarkdown
            key={`${message.id}-${index}`}
            id={`${message.id}-${index}`}
            content={part.text}
          />
        ) : null,
      )}
    </div>
  );
}

function AssistantMessage({ message }: { message: UIMessage }) {
  return (
    <div className="w-full px-3 font-serif text-lg">
      <MessageContent parts={message.parts} />
    </div>
  );
}

function MessageContent({
  parts,
}: {
  parts: UIMessagePart<UIDataTypes, UITools>[];
}) {
  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "step-start") {
          return null;
        }

        if (typeof part.type === "string" && part.type.startsWith("tool-")) {
          return <ToolInvocation key={index} part={part} />;
        }

        switch (part.type) {
          case "text":
            return (
              <MemoizedMarkdown
                key={index}
                id={`content-${index}`}
                content={part.text}
              />
            );
          case "reasoning":
            return (
              <div key={index} className="text-muted-foreground text-sm mb-2">
                {part.text}
              </div>
            );
          case "dynamic-tool":
            return <ToolInvocation key={index} part={part} />;
          default:
            return null;
        }
      })}
    </>
  );
}

function ToolInvocation({
  part,
}: {
  part: UIMessagePart<UIDataTypes, UITools>;
}) {
  const partAny = part as any;
  const toolName =
    typeof part.type === "string" && part.type.startsWith("tool-")
      ? part.type.replace("tool-", "")
      : partAny.toolName || "unknown";
  const input = partAny.input;
  const output = partAny.output;
  const toolCallId = partAny.toolCallId;
  const state = partAny.state;

  const isLoading = !output || state !== "output-available";

  return (
    <div key={toolCallId} className="mb-2">
      {input && (
        <div className="font-mono text-sm flex flex-row items-center max-w-full">
          <div className="font-medium shrink-0">{toolName}</div>
          <div className="shrink-0">{"("}</div>
          <div className="font-mono text-sm overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
            {typeof input === "object" && "query" in input
              ? `"${input.query}"`
              : JSON.stringify(input)}
          </div>
          <div className="shrink-0">{")"}</div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-row gap-[1ch] font-mono text-sm">
          <span>⎿</span>
          <span>
            loading
            <AnimatedEllipsis />
          </span>
        </div>
      ) : (
        <ToolOutput toolName={toolName} output={output} />
      )}
    </div>
  );
}

function ToolOutput({ toolName, output }: { toolName: string; output: any }) {
  switch (toolName) {
    case "search":
      return <SearchOutput output={output} />;
    default:
      return (
        <div className="flex flex-row gap-[1ch] font-mono text-sm">
          <span>⎿</span>
          <span className="text-zinc-500">done</span>
        </div>
      );
  }
}

function reconstructPermalink(metadata: Record<string, any>): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const type = metadata.type;

  // GitHub issues
  if (type === "github_issue") {
    const owner = metadata.owner;
    const repo = metadata.repo;
    const issueNumber = metadata.issue_number;
    if (owner && repo && issueNumber != null) {
      return `https://github.com/${owner}/${repo}/issues/${issueNumber}`;
    }
  }

  // Slack messages
  if (type === "slack_message") {
    const channelId = metadata.channel_id;
    const ts = metadata.ts;
    if (channelId && ts) {
      // Format timestamp: remove decimal point
      const tsFormatted = String(ts).replace(".", "");
      // Note: We don't have workspace domain, so using a generic format
      // This could be improved if workspace info is available in metadata
      return `https://app.slack.com/client/${channelId}/message/${tsFormatted}`;
    }
  }

  // Files
  if (type === "file") {
    const url = metadata.url;
    if (url && typeof url === "string") {
      return url;
    }
  }

  // Contacts don't have permalinks
  if (type === "contact") {
    return null;
  }

  return null;
}

function SearchOutput({ output }: { output: any }) {
  const [expanded, setExpanded] = useState(false);

  const results = output?.results;
  if (!results?.length) {
    return (
      <div className="flex flex-row gap-[1ch] font-mono text-sm">
        <span>⎿</span>
        <span className="text-zinc-500">no results</span>
      </div>
    );
  }

  if (!expanded) {
    return (
      <div className="flex flex-row gap-[1ch] font-mono text-sm">
        <span>⎿</span>
        <span
          className="cursor-pointer hover:underline"
          onClick={() => setExpanded(true)}
        >
          found <AnimatedNumber value={results.length} />{" "}
          {results.length === 1 ? "result" : "results"}
        </span>
      </div>
    );
  }

  function formatResultLabel(metadata: Record<string, any>): string {
    const type = metadata?.type;
    
    if (type === "github_issue") {
      const issueNumber = metadata.issue_number;
      if (issueNumber != null) {
        return `issue #${issueNumber}`;
      }
    }
    
    if (type === "slack_message") {
      return "slack message";
    }
    
    if (type === "file") {
      const title = metadata.title;
      if (title) {
        return title;
      }
    }
    
    if (type === "contact") {
      const fullName = metadata.fullName;
      if (fullName) {
        return fullName;
      }
    }
    
    return metadata?.document_key || "unknown";
  }

  return (
    <div className="flex flex-row gap-[1ch] font-mono text-sm max-w-full">
      <span className="shrink-0">⎿</span>
      <div className="flex-1 min-w-0 flex flex-col">
        {results.map((result: any, index: number) => {
          const permalink = result.permalink || reconstructPermalink(result.metadata || {});
          const hasLink = permalink && typeof permalink === "string";
          const content = formatResultLabel(result.metadata || {});
          
          if (hasLink) {
            return (
              <motion.a
                key={index}
                href={permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate w-full cursor-pointer hover:underline text-black dark:text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03, duration: 0.01 }}
              >
                {content}
              </motion.a>
            );
          }
          
          return (
            <motion.div
              key={index}
              className="truncate w-full text-black dark:text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.03, duration: 0.01 }}
            >
              {content}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function Message({ message }: MessageProps): ReactNode {
  const { role } = message;

  if (role === "user") {
    return <UserMessage message={message} />;
  }

  if (role === "assistant") {
    return <AssistantMessage message={message} />;
  }

  return null;
}

