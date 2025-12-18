import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/session";
import { db } from "@/index";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const verifySession = cache(async () => {
  const cookie = (await cookies()).get("session")?.value;
  const session = await decrypt(cookie);

  if (!session?.userId) {
    redirect("/login");
  }

  return { isAuth: true, userId: session.userId };
});

export const getSession = cache(async () => {
  const cookie = (await cookies()).get("session")?.value;
  const session = await decrypt(cookie);
  return session;
});

export const getUser = cache(async () => {
  const session = await verifySession();
  if (!session) return null;

  try {
    const data = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    const user = data[0];

    return user;
  } catch (error) {
    return null;
  }
});

export const getUserOptional = cache(async () => {
  const session = await getSession();
  if (!session?.userId) return null;

  try {
    const data = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    const user = data[0];

    return user;
  } catch (error) {
    return null;
  }
});
