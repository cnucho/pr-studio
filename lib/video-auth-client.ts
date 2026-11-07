import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

export function videoAuthClient() {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("영상 생성 로그인이 설정되지 않았습니다.");
  browserClient = createClient(url, key);
  return browserClient;
}

export async function videoAccessToken() {
  const { data, error } = await videoAuthClient().auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("영상 생성 계정으로 먼저 로그인해 주세요.");
  }
  return data.session.access_token;
}
