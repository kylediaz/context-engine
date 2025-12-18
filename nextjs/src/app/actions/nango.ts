"use server";

import { db } from "@/index";
import { userConnections } from "@/db/schema";
import { getUser } from "@/lib/dal";
import { Nango } from "@nangohq/node";
import { and, eq } from "drizzle-orm";

const nango = new Nango({ secretKey: process.env.NANGO_SECRET_KEY! });

export async function getNangoSessionToken() {
  const user = await getUser();
  if (!user) {
    throw new Error("User not found");
  }
  const res = await nango.createConnectSession({
    end_user: {
      id: user.id,
      email: user.email,
      display_name: user.displayName,
    },
  });

  return res.data.token;
}

export async function getNangoConnections() {
  const user = await getUser();
  if (!user) {
    throw new Error("User not found");
  }
  const connections = await db
    .select()
    .from(userConnections)
    .where(eq(userConnections.userId, user.id));
  return connections;
}

export async function deleteNangoConnection(
  providerConfigKey: string,
  connectionId: string,
) {
  const user = await getUser();
  if (!user) {
    throw new Error("User not found");
  }
  const res = await nango.deleteConnection(providerConfigKey, connectionId);
  if (res.status === 200) {
    await db
      .delete(userConnections)
      .where(
        and(
          eq(userConnections.userId, user.id),
          eq(userConnections.connectionId, connectionId),
        ),
      )
      .returning();
  } else {
    throw new Error("Failed to delete connection");
  }
}
