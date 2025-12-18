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

  return (
    <div className="flex flex-row gap-[1ch] font-mono text-sm max-w-full">
      <span className="shrink-0">⎿</span>
      <div className="flex-1 min-w-0">
        {results.map((result: any, index: number) => (
          <motion.div
            key={index}
            className="truncate w-full cursor-pointer hover:underline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.03, duration: 0.01 }}
          >
            {result.path || "unknown"}
          </motion.div>
        ))}
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

