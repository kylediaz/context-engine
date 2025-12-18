"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ChromaCredentialsForm from "@/components/chroma-credentials-form";
import { Settings } from "lucide-react";

interface ChromaCredentialsDialogProps {
  initialData?: {
    apiKey?: string;
    databaseName?: string;
    tenantUuid?: string;
  };
  hasCredentials: boolean;
}

export default function ChromaCredentialsDialog({
  initialData,
  hasCredentials,
}: ChromaCredentialsDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Settings className="size-4 mr-2" />
          {hasCredentials ? "Update Chroma Credentials" : "Set Chroma Credentials"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {hasCredentials ? "Update Chroma Credentials" : "Set Chroma Credentials"}
          </DialogTitle>
        </DialogHeader>
        <ChromaCredentialsForm
          initialData={initialData}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

