"use server";

import { db } from "@/index";
import { userChromaCredentials } from "@/db/schema";
import { getUser } from "@/lib/dal";
import { eq } from "drizzle-orm";
import { ChromaCredentialsSchema, type ChromaCredentialsFormState } from "@/lib/definitions";

export async function saveChromaCredentials(
  state: ChromaCredentialsFormState,
  formData: FormData
) {
  const user = await getUser();
  if (!user) {
    return {
      message: "User not found.",
    };
  }

  const validatedFields = ChromaCredentialsSchema.safeParse({
    apiKey: formData.get("apiKey"),
    databaseName: formData.get("databaseName"),
    tenantUuid: formData.get("tenantUuid"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { apiKey, databaseName, tenantUuid } = validatedFields.data;

  try {
    const existing = await db
      .select()
      .from(userChromaCredentials)
      .where(eq(userChromaCredentials.userId, user.id))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(userChromaCredentials)
        .set({
          apiKey,
          databaseName,
          tenantUuid,
        })
        .where(eq(userChromaCredentials.userId, user.id));
    } else {
      await db.insert(userChromaCredentials).values({
        userId: user.id,
        apiKey,
        databaseName,
        tenantUuid,
      });
    }

    return { message: "Chroma credentials saved successfully." };
  } catch (error) {
    console.error("Error saving Chroma credentials:", error);
    return {
      message: "An error occurred while saving credentials.",
    };
  }
}

export async function getChromaCredentials() {
  const user = await getUser();
  if (!user) {
    return null;
  }

  try {
    const credentials = await db
      .select()
      .from(userChromaCredentials)
      .where(eq(userChromaCredentials.userId, user.id))
      .limit(1);

    return credentials[0] || null;
  } catch (error) {
    console.error("Error fetching Chroma credentials:", error);
    return null;
  }
}

