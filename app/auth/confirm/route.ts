import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

// Sign-in links land here. Verifying the token hash works in any browser or device,
// unlike the code flow, which only works in the browser that requested the link.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") || "email") as EmailOtpType;
  if (token_hash) {
    const { error } = await supabaseServer().auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(new URL("/", url.origin));
    console.error("sign-in link verify failed", error.message);
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
