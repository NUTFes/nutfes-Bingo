export type StateUpdateAuthority = "authoritative" | "incremental";

export function shouldAcceptRevision(
  currentRevision: number,
  nextRevision: number,
  authority: StateUpdateAuthority,
): boolean {
  return authority === "authoritative" || nextRevision >= currentRevision;
}
