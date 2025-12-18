"use client";

import { useState } from "react";
import NangoConnect from "@/components/nango-connect";
import ConnectionsTable from "@/components/connections-table";

export default function IntegrationsSection() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Integrations</h3>
        <NangoConnect onRefresh={handleRefresh} />
      </div>
      <ConnectionsTable refreshKey={refreshKey} />
    </div>
  );
}
