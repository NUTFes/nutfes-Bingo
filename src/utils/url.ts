export function normalizeHttpsUrl(input: string, message = "URLの形式が不正です。") {
  const trimmed = input.trim();

  if (trimmed === "") {
    return "";
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(message);
  }

  if (url.protocol !== "https:") {
    throw new Error("URLは https のみ許可します。");
  }

  return url.toString();
}

function isSafeHttpsUrl(input: string) {
  try {
    return normalizeHttpsUrl(input) !== "";
  } catch {
    return false;
  }
}

export function openHttpsUrl(input: string) {
  if (!isSafeHttpsUrl(input)) {
    return false;
  }

  window.open(new URL(input).toString(), "_blank", "noopener,noreferrer");
  return true;
}
