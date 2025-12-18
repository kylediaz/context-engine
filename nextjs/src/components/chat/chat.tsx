"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChatInput } from "./chat-input";
import { Message } from "./message";
import { AnimatedEllipsis } from "@/components/shared/misc";

function useScrollToBottom<T extends HTMLElement>(): [
  React.RefObject<T>,
  React.RefObject<T>,
] {
  const containerRef = useRef<T>(null);
  const endRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    const end = endRef.current;

    if (container && end) {
      const observer = new MutationObserver(() => {
        end.scrollIntoView({ behavior: "smooth" });
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
      });

      return () => observer.disconnect();
    }
  }, []);

  return [containerRef as React.RefObject<T>, endRef as React.RefObject<T>];
}

export function Chat() {
  const {
    messages,
    sendMessage,
    status,
    error: chatError,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const [input, setInput] = useState<string>("");
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  const onSubmit = useMemo(
    () => async (inputValue: string) => {
      sendMessage({
        text: inputValue,
      });
      setInput("");
    },
    [sendMessage],
  );

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-scroll">
        <div ref={messagesContainerRef} className="py-8">
          <div className="w-full max-w-xl flex flex-col items-start gap-[1em] mx-auto px-4">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
              >
                <div className="rounded-lg p-6 bg-zinc-50">
                  <h2 className="font-medium mb-2">Ready to chat</h2>
                  <p className="text-zinc-600">
                    Ask questions about your documents stored in Chroma.
                  </p>
                </div>
              </motion.div>
            )}
            {messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
            {status === "submitted" && (
              <div className="text-gray-500 font-serif px-3 text-lg">
                Thinking
                <AnimatedEllipsis />
              </div>
            )}
            {status === "error" && chatError && (
              <div className="text-red-500">Error: {chatError?.message}</div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      <div className="pb-4 px-4">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            input={input}
            setInput={setInput}
            onSubmit={onSubmit}
            disabled={status === "submitted"}
          />
        </div>
      </div>
    </div>
  );
}

