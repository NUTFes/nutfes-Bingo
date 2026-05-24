import { LoginForm } from "@/features/admin";
import { isAdminSignupEnabled } from "@/lib/supabase/config";

type LoginPageProps = {
  searchParams: Promise<{
    redirectTo?: string;
  }>;
};

export default async function Page({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-svh items-center bg-background px-4 py-6 text-foreground sm:px-6">
      <section className="mx-auto w-full max-w-md">
        <LoginForm redirectTo={params.redirectTo} canSignUp={isAdminSignupEnabled()} />
      </section>
    </main>
  );
}
