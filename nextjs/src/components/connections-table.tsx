"use client";

import { useEffect, useState } from "react";
import {
  Empty,
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

export default function ConnectionsTable({
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

  const capitalizeProvider = (provider: string) => {
    return provider
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
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

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="h-10 px-4 text-left text-sm font-medium text-muted-foreground">
              Provider
            </th>
            <th className="h-10 px-4 text-right text-sm font-medium text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {connections.map((connection) => (
            <tr key={connection.id} className="border-b last:border-0">
              <td className="h-10 px-4 text-sm capitalize">
                {capitalizeProvider(connection.providerConfigKey)}
              </td>
              <td className="h-10 px-4 text-right">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

