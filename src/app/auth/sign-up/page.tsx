import { SignUpForm } from "@/components/admin/auth/sign-up-form";

export default function Page() {
  return (
    <main className="flex min-h-svh items-center bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-6">
      <section className="mx-auto w-full max-w-md">
        <SignUpForm />
      </section>
    </main>
  );
}
