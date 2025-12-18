"use client";

import { signup } from "@/app/actions/auth";
import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

export default function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form action={action}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            name="name"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            aria-invalid={state?.errors?.name ? "true" : "false"}
          />
          <FieldError
            errors={state?.errors?.name?.map((e) => ({ message: e }))}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-invalid={state?.errors?.email ? "true" : "false"}
          />
          <FieldError
            errors={state?.errors?.email?.map((e) => ({ message: e }))}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-invalid={state?.errors?.password ? "true" : "false"}
          />
          <FieldError
            errors={state?.errors?.password?.map((e) => ({ message: e }))}
          />
        </Field>

        {state &&
          typeof state === "object" &&
          "message" in state &&
          typeof state.message === "string" && (
            <FieldError>{state.message}</FieldError>
          )}

        <Field>
          <Button disabled={pending} type="submit" className="w-full">
            {pending ? "Signing up..." : "Sign Up"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
