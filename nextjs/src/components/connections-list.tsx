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
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  getNangoConnections,
  deleteNangoConnection,
} from "@/app/actions/nango";
import { Trash2 } from "lucide-react";

interface Connection {
  id: string;
  connectionId: string;
  providerConfigKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function ConnectionsList({
  refreshKey,
}: {
  refreshKey?: number;
}) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadConnections = async () => {
    try {
      setIsLoading(true);
      const data = await getNangoConnections();
      setConnections(data);
    } catch (error) {
      console.error("Error loading connections:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (
    providerConfigKey: string,
    connectionId: string,
  ) => {
    try {
      await deleteNangoConnection(providerConfigKey, connectionId);
      await loadConnections();
    } catch (error) {
      console.error("Error deleting connection:", error);
    }
  };

  useEffect(() => {
    loadConnections();
  }, [refreshKey]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No connections</EmptyTitle>
          <EmptyDescription>
            No connections yet. Connect an integration to get started.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const formatDate = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return "Updated today";
    } else if (diffInDays === 1) {
      return "Updated yesterday";
    } else if (diffInDays < 7) {
      return `Updated ${diffInDays} days ago`;
    } else {
      return `Updated ${dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year:
          dateObj.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      })}`;
    }
  };

  const capitalizeProvider = (provider: string) => {
    return provider
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <ItemGroup className="space-y-2">
      {connections.map((connection) => (
        <Item key={connection.id} size="sm">
          <ItemContent>
            <ItemTitle className="capitalize">
              {capitalizeProvider(connection.providerConfigKey)}
            </ItemTitle>
            <ItemDescription>
              {formatDate(connection.updatedAt)}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                handleDelete(
                  connection.providerConfigKey,
                  connection.connectionId,
                )
              }
              aria-label={`Delete ${capitalizeProvider(connection.providerConfigKey)} connection`}
            >
              <Trash2 className="size-4" />
            </Button>
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  );
}
