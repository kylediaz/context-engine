"use client";

import { useEffect, useState } from "react";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
  ItemActions,
} from "@/components/ui/item";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  generateApiKey,
  getApiKeys,
  deleteApiKey,
} from "@/app/actions/api-keys";
import { Trash2, Copy, Check, Key } from "lucide-react";

interface ApiKey {
  id: string;
  name: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
}

export default function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKeys = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getApiKeys();
      setKeys(data);
    } catch (error) {
      console.error("Error loading API keys:", error);
      setError("Failed to load API keys. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      const result = await generateApiKey(keyName || undefined);
      if (result.success && result.key) {
        setGeneratedKey(result.key);
        setKeyName("");
        await loadKeys();
      } else if (result.error) {
        setError(result.error);
      } else {
        setError("Failed to generate API key. Please try again.");
      }
    } catch (error) {
      console.error("Error generating API key:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (keyId: string) => {
    try {
      setError(null);
      const result = await deleteApiKey(keyId);
      if (result.error) {
        setError(result.error);
      } else {
        await loadKeys();
        if (generatedKey) {
          setGeneratedKey(null);
        }
      }
    } catch (error) {
      console.error("Error deleting API key:", error);
      setError("An unexpected error occurred. Please try again.");
    }
  };

  const handleCopy = async () => {
    if (generatedKey) {
      await navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Never";
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return "Today";
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year:
          dateObj.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {generatedKey && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Key className="size-4 text-green-600" />
            <p className="text-sm font-semibold text-green-600">
              API Key Generated
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Make sure to copy this key. You won't be able to see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-background px-3 py-2 text-sm font-mono">
              {generatedKey}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <Check className="size-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Key name (optional)"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            size="default"
          >
            {isGenerating ? "Generating..." : "Generate Key"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : keys.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No API keys</EmptyTitle>
            <EmptyDescription>
              Generate an API key to access the MCP endpoint.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ItemGroup className="space-y-2">
          {keys.map((key) => (
            <Item key={key.id} size="sm">
              <ItemContent>
                <ItemTitle>{key.name || "Unnamed key"}</ItemTitle>
                <ItemDescription>
                  Created {formatDate(key.createdAt)} • Last used{" "}
                  {formatDate(key.lastUsedAt)}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(key.id)}
                  aria-label={`Delete API key ${key.name || key.id}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      )}
    </div>
  );
}

