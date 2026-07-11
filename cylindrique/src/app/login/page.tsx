import { SignInButton } from "@/components/auth/sign-in-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-1 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <span className="font-heading text-lg font-semibold">C</span>
          </div>
          <CardTitle className="text-xl">Welcome to Cylindrique</CardTitle>
          <CardDescription>
            Sign in to your workspace to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInButton next={next} />
        </CardContent>
      </Card>
    </div>
  );
}
