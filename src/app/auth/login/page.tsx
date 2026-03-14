import { LoginForm } from "@/components/login-form";

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
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
