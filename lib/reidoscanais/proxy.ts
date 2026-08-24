const API_BASE = "https://api.reidoscanais.st";

type ProxyOptions = {
  path: string;
  params?: Record<string, string>;
  maxAge?: number;
};

export async function proxyApi({
  path,
  params = {},
  maxAge = 0,
}: ProxyOptions) {
  const upstreamUrl = new URL(path, API_BASE);

  for (const [key, value] of Object.entries(params)) {
    if (value) upstreamUrl.searchParams.set(key, value);
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { Accept: "application/json" },
    });

    const body = await upstream.text();

    return new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ??
          "application/json; charset=utf-8",
        "Cache-Control": upstream.ok
          ? `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=60`
          : "no-store",
      },
    });
  } catch {
    return Response.json(
      {
        success: false,
        data: null,
        message: "A API de canais está indisponível.",
      },
      { status: 503 },
    );
  }
}
