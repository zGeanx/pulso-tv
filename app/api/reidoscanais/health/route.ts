import { proxyApi } from "../../../../lib/reidoscanais/proxy";

export async function GET() {
  return proxyApi({ path: "/health", maxAge: 0 });
}