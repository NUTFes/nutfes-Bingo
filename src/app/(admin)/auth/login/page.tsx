import { LoginForm } from "@/features/admin";

type LoginPageProps = {
  searchParams: Promise<{
    redirectTo?: string;
  }>;
};

export default async function Page({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-svh items-center bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-6">
      <section className="mx-auto w-full max-w-md">
        <LoginForm redirectTo={params.redirectTo} />
      </section>
    </main>
  );
}
