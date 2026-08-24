import { proxyApi } from "../../../../lib/reidoscanais/proxy";

export async function GET() {
  return proxyApi({
    path: "/channels/categories",
    maxAge: 1800,
  });
}