"use client";

import { saveChromaCredentials } from "@/app/actions/chroma";
import { type ChromaCredentialsFormState } from "@/lib/definitions";
import { useActionState, useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { parseChromaCode } from "@/lib/parse";
import { Check } from "lucide-react";

interface ChromaCredentialsFormProps {
  initialData?: {
    apiKey?: string;
    databaseName?: string;
    tenantUuid?: string;
  };
}

export default function ChromaCredentialsForm({
  initialData,
}: ChromaCredentialsFormProps) {
  const [state, action, pending] = useActionState<
    ChromaCredentialsFormState,
    FormData
  >(saveChromaCredentials, undefined);
  const [apiKey, setApiKey] = useState(initialData?.apiKey || "");
  const [databaseName, setDatabaseName] = useState(
    initialData?.databaseName || "",
  );
  const [tenantUuid, setTenantUuid] = useState(initialData?.tenantUuid || "");
  const [codeSnippet, setCodeSnippet] = useState("");

  useEffect(() => {
    if (initialData) {
      setApiKey(initialData.apiKey || "");
      setDatabaseName(initialData.databaseName || "");
      setTenantUuid(initialData.tenantUuid || "");
    }
  }, [initialData]);

  useEffect(() => {
    if (
      state &&
      typeof state === "object" &&
      "message" in state &&
      state.message &&
      !state.errors
    ) {
      setCodeSnippet("");
    }
  }, [state]);

  const handleCodePaste = (value: string) => {
    setCodeSnippet(value);
    const parsed = parseChromaCode(value);
    if (parsed.apiKey) setApiKey(parsed.apiKey);
    if (parsed.databaseName) setDatabaseName(parsed.databaseName);
    if (parsed.tenantUuid) setTenantUuid(parsed.tenantUuid);
  };

  const placeholder = `import chromadb

client = chromadb.CloudClient(
  api_key='your-api-key',
  tenant='${tenantUuid || "your-tenant-uuid"}',
  database='${databaseName || "your-database-name"}'
)`;

  const isSuccess =
    state &&
    typeof state === "object" &&
    "message" in state &&
    state.message &&
    !state.errors;
  const hasCredentials = !!(
    initialData?.apiKey &&
    initialData?.databaseName &&
    initialData?.tenantUuid
  );

  return (
    <form action={action}>
      <input type="hidden" name="apiKey" value={apiKey} />
      <input type="hidden" name="databaseName" value={databaseName} />
      <input type="hidden" name="tenantUuid" value={tenantUuid} />
      <FieldGroup>
        <Field>
          <Textarea
            id="codeSnippet"
            placeholder={placeholder}
            value={codeSnippet}
            onChange={(e) => handleCodePaste(e.target.value)}
            rows={6}
            className="font-mono text-sm whitespace-pre overflow-x-auto resize-none"
          />
        </Field>

        {state &&
          typeof state === "object" &&
          "errors" in state &&
          state.errors && (
            <FieldError>
              {Object.values(state.errors).flat().join(", ")}
            </FieldError>
          )}

        <Field>
          <Button disabled={pending} type="submit" className="w-full">
            {isSuccess ? (
              <>
                <Check className="size-4" />
                Saved
              </>
            ) : pending ? (
              "Saving..."
            ) : hasCredentials ? (
              "Update Credentials"
            ) : (
              "Set Credentials"
            )}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
