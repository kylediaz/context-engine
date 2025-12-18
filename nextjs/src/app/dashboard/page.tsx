import { getUser } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { getChromaCredentials } from "@/app/actions/chroma";
import { redirect } from "next/navigation";
import IntegrationsSection from "@/components/integrations-section";
import ChromaCredentialsForm from "@/components/chroma-credentials-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const chromaCredentials = await getChromaCredentials();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Dashboard</CardTitle>
              <CardDescription>
                Welcome back, {user.displayName}!
              </CardDescription>
            </div>
            <CardAction>
              <form action={logout}>
                <Button type="submit" variant="destructive" size="sm">
                  Logout
                </Button>
              </form>
            </CardAction>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Display Name</p>
              <p className="text-sm font-medium">{user.displayName}</p>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-4">
                  Chroma Credentials
                </h3>
                <ChromaCredentialsForm
                  initialData={
                    chromaCredentials
                      ? {
                          apiKey: chromaCredentials.apiKey,
                          databaseName: chromaCredentials.databaseName,
                          tenantUuid: chromaCredentials.tenantUuid,
                        }
                      : undefined
                  }
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <IntegrationsSection />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
