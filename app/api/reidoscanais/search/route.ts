import { proxyApi } from "../../../../lib/reidoscanais/proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2 || query.length > 100) {
    return Response.json(
      {
        success: false,
        data: { channels: [], events: [] },
        message: "A busca deve ter entre 2 e 100 caracteres.",
      },
      { status: 400 },
    );
  }

  return proxyApi({
    path: "/search",
    params: { q: query },
    maxAge: 30,
  });
}