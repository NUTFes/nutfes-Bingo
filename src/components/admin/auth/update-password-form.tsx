"use client";

import { useActionState } from "react";

import { INITIAL_AUTH_ACTION_STATE } from "@/app/auth/action-state";
import { updatePassword } from "@/app/auth/actions";
import { Button } from "@/components/ui/Button";
import { Form } from "@/components/ui/Form";
import { TextField } from "@/components/ui/TextField";

export function UpdatePasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePassword, INITIAL_AUTH_ACTION_STATE);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 text-zinc-100 shadow-xl">
        <div className="space-y-2 border-b border-zinc-800 p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Admin Auth
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-tight">
            新しいパスワードを設定
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300">
            管理画面で利用する新しいパスワードを入力してください。
          </p>
        </div>
        <div className="p-6 sm:p-7">
          <Form action={formAction} className="gap-5">
            <TextField
              name="password"
              type="password"
              label="新しいパスワード"
              placeholder="新しいパスワード"
              isRequired
            />
            {state.error && (
              <p className="rounded-md border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm text-red-200">
                {state.error}
              </p>
            )}
            <Button type="submit" className="h-11 w-full" isDisabled={isPending}>
              {isPending ? "保存中..." : "パスワードを更新"}
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
}
