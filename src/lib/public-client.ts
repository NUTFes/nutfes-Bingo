export const PUBLIC_CLIENT_ID_COOKIE = "nutfes_bingo_client_id";
export const PUBLIC_CLIENT_ID_MAX_AGE = 60 * 60 * 24 * 365;

export function createPublicClientId() {
  return crypto.randomUUID();
}

export function isValidPublicClientId(value: string | undefined) {
  return Boolean(
    value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  );
}
