import { redirect } from "next/navigation";
import { getUserOptional } from "@/lib/dal";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const user = await getUserOptional();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Context Engine</CardTitle>
          <CardDescription>
            Get started by signing up or logging in to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/signup">Sign Up</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Log In</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
