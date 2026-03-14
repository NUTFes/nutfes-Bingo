import { LoginForm } from "@/components/admin/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<{
    redirectTo?: string;
  }>;
};

function sanitizeRedirectTo(redirectTo: string | undefined) {
  if (!redirectTo) {
    return undefined;
  }

  return redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : undefined;
}

export default async function Page({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = sanitizeRedirectTo(params.redirectTo);

  return (
    <main className="flex min-h-svh items-center bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-6">
      <section className="mx-auto w-full max-w-md">
        <LoginForm redirectTo={redirectTo} />
      </section>
    </main>
  );
}
