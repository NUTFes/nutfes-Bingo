import { LoginForm } from "@/features/admin";

export default function Page() {
  return (
    <main className="flex min-h-svh items-center bg-background px-4 py-6 text-foreground sm:px-6">
      <section className="mx-auto w-full max-w-md">
        <LoginForm />
      </section>
    </main>
  );
}
