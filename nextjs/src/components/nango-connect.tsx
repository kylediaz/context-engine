"use client";

import { useEffect, useState } from "react";
import Nango from "@nangohq/frontend";
import { Button } from "@/components/ui/button";
import { getNangoSessionToken } from "@/app/actions/nango";

interface NangoConnectProps {
  onConnect?: () => void;
  onClose?: () => void;
  onRefresh?: () => void;
}

export default function NangoConnect({
  onConnect,
  onClose,
  onRefresh,
}: NangoConnectProps) {
  const [nango, setNango] = useState<Nango | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const nangoInstance = new Nango({
      host: process.env.NEXT_PUBLIC_NANGO_HOST || "https://api.nango.dev",
      publicKey: process.env.NEXT_PUBLIC_NANGO_PUBLIC_KEY || "",
    });
    setNango(nangoInstance);
  }, []);

  const handleOpenConnect = async () => {
    if (!nango) return;

    setIsLoading(true);

    try {
      const sessionToken = await getNangoSessionToken();

      if (!sessionToken) {
        throw new Error("Failed to get session token");
      }

      const connect = nango.openConnectUI({
        onEvent: (event) => {
          if (event.type === "close") {
            setIsLoading(false);
            onClose?.();
          } else if (event.type === "connect") {
            setIsLoading(false);
            onConnect?.();
            onRefresh?.();
          }
        },
      });

      connect.setSessionToken(sessionToken);
    } catch (error) {
      console.error("Error opening Nango connect:", error);
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleOpenConnect} disabled={isLoading || !nango}>
      {isLoading ? "Loading..." : "Connect Integration"}
    </Button>
  );
}
