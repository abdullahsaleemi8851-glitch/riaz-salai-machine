import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const inquirySchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(30).regex(/^[+\d\s().-]+$/),
  message: z.string().trim().min(5).max(2000),
  website: z.string().max(0).optional(),
  language: z.enum(["en", "ur"]).default("en"),
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = inquirySchema.safeParse(payload);
  if (!result.success) {
    return NextResponse.json({ error: "Please check your details and try again." }, { status: 400 });
  }
  if (result.data.website) {
    return NextResponse.json({ success: true });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "The inquiry service is not configured yet." }, { status: 503 });
  }

  const { error } = await supabase.from("inquiries").insert({
    customer_name: result.data.name,
    phone: result.data.phone,
    message: result.data.message,
    language: result.data.language,
  });

  if (error) {
    console.error("Could not save customer inquiry:", error.message);
    return NextResponse.json({ error: "We could not save your message. Please contact us on WhatsApp." }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
