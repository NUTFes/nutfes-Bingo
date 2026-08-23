"use client";

import { Link } from "@/components/ui/Link";
import { AuthFormCard } from "./components/AuthFormCard";

export function LoginForm() {
  return (
    <AuthFormCard
      title="管理者ログイン"
      description="管理画面は Cloudflare Access で保護されています。組織の認証画面でログインしてください。"
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          認証画面が表示されない場合は、管理画面へ進むボタンを押してください。
        </p>
        <Link href="/admin" className="h-11 w-full justify-center font-medium">
          管理画面へ進む
        </Link>
      </div>
    </AuthFormCard>
  );
}
