import { notFound } from "next/navigation";
import { connection } from "next/server";

import { SignUpForm } from "@/features/admin";
import { isAdminSignupEnabled } from "@/lib/supabase/config";

export default async function Page() {
  await connection();

  if (!isAdminSignupEnabled()) {
    notFound();
  }

  return (
    <main className="flex min-h-svh items-center bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-6">
      <section className="mx-auto w-full max-w-md">
        <SignUpForm />
      </section>
    </main>
  );
}
