export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function toActionResult<T>(action: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await action() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "予期しないエラーが発生しました。",
    };
  }
}
