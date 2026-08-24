import { proxyApi } from "../../../../lib/reidoscanais/proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category")?.trim() ?? "";

  if (category.length > 80) {
    return Response.json(
      { success: false, data: [], message: "Categoria inválida." },
      { status: 400 },
    );
  }

  return proxyApi({
    path: "/channels",
    params: category ? { category } : {},
    maxAge: 300,
  });
}