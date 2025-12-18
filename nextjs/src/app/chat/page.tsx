import { getUser } from "@/lib/dal";
import { getChromaCredentials } from "@/app/actions/chroma";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat/chat";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ChatPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const chromaCredentials = await getChromaCredentials();

  if (!chromaCredentials) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Chat</CardTitle>
            <CardDescription>
              Configure your Chroma credentials to start chatting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-white">
      <a
        href="/dashboard"
        className="absolute top-2 md:top-6 left-4 text-zinc-500 hover:underline font-mono text-sm z-10"
      >
        ↩ dashboard
      </a>
      <div className="flex-1 overflow-hidden">
        <Chat />
      </div>
    </div>
  );
}

