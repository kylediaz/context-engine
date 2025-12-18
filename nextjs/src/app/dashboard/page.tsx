import { getUser } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { getChromaCredentials } from "@/app/actions/chroma";
import { getNangoConnectionsCount } from "@/app/actions/nango";
import { redirect } from "next/navigation";
import IntegrationsSection from "@/components/integrations-section";
import ChromaCredentialsDialog from "@/components/chroma-credentials-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const chromaCredentials = await getChromaCredentials();
  const connectionsCount = await getNangoConnectionsCount();
  const hasCredentials = !!(
    chromaCredentials?.apiKey &&
    chromaCredentials?.databaseName &&
    chromaCredentials?.tenantUuid
  );
  const hasIntegrations = connectionsCount > 0;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>
                Welcome back, {user.displayName}!
              </CardTitle>
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
          <div className="border-t pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-4">
                  Chroma Credentials
                </h3>
                <ChromaCredentialsDialog
                  initialData={
                    chromaCredentials
                      ? {
                          apiKey: chromaCredentials.apiKey,
                          databaseName: chromaCredentials.databaseName,
                          tenantUuid: chromaCredentials.tenantUuid,
                        }
                      : undefined
                  }
                  hasCredentials={hasCredentials}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="space-y-4">
              {!hasCredentials ? (
                <div>
                  <h3 className="text-sm font-semibold mb-4">Integrations</h3>
                  <p className="text-sm text-muted-foreground">
                    Set your Chroma credentials to enable integrations
                  </p>
                </div>
              ) : (
                <IntegrationsSection />
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-4">Agentic Search</h3>
                {!hasIntegrations ? (
                  <Button className="w-full" disabled>
                    Add an integration to enable chat
                  </Button>
                ) : (
                  <Link href="/chat" className="block">
                    <Button className="w-full">Open Chat</Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
