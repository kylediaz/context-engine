"use server";

import { db } from "@/index";
import { apiKeys } from "@/db/schema";
import { getUser } from "@/lib/dal";
import { eq, desc } from "drizzle-orm";
import { randomBytes } from "crypto";

export async function generateApiKey(name?: string) {
  const user = await getUser();
  if (!user) {
    return {
      error: "User not found.",
    };
  }

  try {
    const key = `ck_${randomBytes(32).toString("hex")}`;

    const [newKey] = await db
      .insert(apiKeys)
      .values({
        userId: user.id,
        key,
        name: name || null,
      })
      .returning();

    return {
      success: true,
      key: newKey.key,
      id: newKey.id,
    };
  } catch (error) {
    console.error("Error generating API key:", error);
    return {
      error: "An error occurred while generating the API key.",
    };
  }
}

export async function getApiKeys() {
  const user = await getUser();
  if (!user) {
    return [];
  }

  try {
    const keys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        createdAt: apiKeys.createdAt,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, user.id))
      .orderBy(desc(apiKeys.createdAt));

    return keys;
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return [];
  }
}

export async function deleteApiKey(keyId: string) {
  const user = await getUser();
  if (!user) {
    return {
      error: "User not found.",
    };
  }

  try {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, keyId))
      .limit(1);

    if (!key || key.userId !== user.id) {
      return {
        error: "API key not found.",
      };
    }

    await db.delete(apiKeys).where(eq(apiKeys.id, keyId));

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting API key:", error);
    return {
      error: "An error occurred while deleting the API key.",
    };
  }
}

export async function validateApiKey(key: string) {
  try {
    const [apiKey] = await db
      .select({
        id: apiKeys.id,
        userId: apiKeys.userId,
        expiresAt: apiKeys.expiresAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.key, key))
      .limit(1);

    if (!apiKey) {
      return null;
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, apiKey.id));

    return {
      userId: apiKey.userId,
    };
  } catch (error) {
    console.error("Error validating API key:", error);
    return null;
  }
}

