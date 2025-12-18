import { NextRequest, NextResponse } from "next/server";
import type { NangoWebhookBody } from "@/types/nango";
import { processNangoWebhook } from "@/workflows/nango";
import { FatalError } from "workflow";
import { start } from "workflow/api";

export async function POST(request: NextRequest) {
  try {
    const body: NangoWebhookBody = await request.json();

    await start(processNangoWebhook, [body]);

    return NextResponse.json(
      { message: "Webhook processed successfully" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process webhook",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
