import { proxyApi } from "../../../../lib/reidoscanais/proxy";

const validStatuses = new Set(["live", "upcoming", "finished"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status")?.trim() ?? "";
  const category = url.searchParams.get("category")?.trim() ?? "";
  const popular = url.searchParams.get("popular")?.trim() ?? "";

  if (status && !validStatuses.has(status)) {
    return Response.json(
      { success: false, data: [], message: "Status inválido." },
      { status: 400 },
    );
  }

  if (category.length > 80 || (popular && popular !== "true")) {
    return Response.json(
      { success: false, data: [], message: "Parâmetros inválidos." },
      { status: 400 },
    );
  }

  return proxyApi({
    path: "/sports",
    params: {
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(popular ? { popular } : {}),
    },
    maxAge: status === "live" ? 30 : 300,
  });
}
