const WEAK_PREFIX = "W/";

function readOpaqueEntityTag(value: string): string | null {
  const candidate = value.startsWith(WEAK_PREFIX) ? value.slice(WEAK_PREFIX.length) : value;
  if (candidate.length < 2 || candidate[0] !== '"' || candidate.at(-1) !== '"') {
    return null;
  }

  const opaqueTag = candidate.slice(1, -1);
  for (const character of opaqueTag) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined || codePoint <= 0x20 || codePoint === 0x22 || codePoint === 0x7f) {
      return null;
    }
  }
  return opaqueTag;
}

export function weaklyMatchesEntityTag(actual: string | null, expected: string): boolean {
  if (actual === null) return false;
  const actualOpaqueTag = readOpaqueEntityTag(actual);
  return actualOpaqueTag !== null && actualOpaqueTag === readOpaqueEntityTag(expected);
}

export function makeStateEtag(revision: number): string {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new RangeError("state revision must be a non-negative safe integer");
  }
  return `W/"state:${revision}"`;
}
