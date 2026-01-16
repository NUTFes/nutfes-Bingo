import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseInternalUrl = process.env.SUPABASE_INTERNAL_URL ?? supabaseUrl;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ message: "email and password required" });
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    return res
      .status(500)
      .json({ message: "Supabase environment variables are missing" });
  }

  try {
    const supabase = createClient(supabaseInternalUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session) {
      return res
        .status(401)
        .json({ message: error?.message || "Unauthorized" });
    }

    return res.status(200).json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: String(err) });
  }
}
