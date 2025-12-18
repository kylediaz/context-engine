"use server";

import { redirect } from "next/navigation";
import {
  SignupFormSchema,
  LoginFormSchema,
  FormState,
} from "@/lib/definitions";
import { db } from "@/index";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createSession, deleteSession } from "@/lib/session";

export async function signup(state: FormState, formData: FormData) {
  const validatedFields = SignupFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, email, password } = validatedFields.data;

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const data = await db
      .insert(users)
      .values({
        email,
        displayName: name,
        password: hashedPassword,
      })
      .returning({ id: users.id });

    const user = data[0];

    if (!user) {
      return {
        message: "An error occurred while creating your account.",
      };
    }

    await createSession(user.id);
    redirect("/dashboard");
  } catch (error) {
    if (error instanceof Error && error.message.includes("unique")) {
      return {
        errors: {
          email: ["This email is already registered."],
        },
      };
    }
    return {
      message: "An error occurred while creating your account.",
    };
  }
}

export async function login(state: FormState, formData: FormData) {
  const validatedFields = LoginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validatedFields.data;

  const data = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const user = data[0];

  if (!user || !user.password) {
    return {
      errors: {
        email: ["Invalid email or password."],
      },
    };
  }

  const passwordsMatch = await bcrypt.compare(password, user.password);

  if (!passwordsMatch) {
    return {
      errors: {
        email: ["Invalid email or password."],
      },
    };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
