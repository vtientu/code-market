import { cookies } from "next/headers";

export async function GET() {
  return new Response("Hello, World!");
}
