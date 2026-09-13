const API_BASE = "https://api.reidoscanais.st";

type JsonResponseOptions = {
  status?: number;
  cacheControl?: string;
};

export function jsonApiResponse(
  body: unknown,
  { status = 200, cacheControl = "no-store" }: JsonResponseOptions = {},
) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": cacheControl,
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function invalidUpstreamResponse() {
  return jsonApiResponse(
    {
      success: false,
      data: null,
      message: "A API de canais retornou uma resposta inválida.",
    },
    { status: 502 },
  );
}

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

    if ([204, 205, 304].includes(upstream.status)) {
      return invalidUpstreamResponse();
    }

    const body = await upstream.text();
    let payload: unknown;

    try {
      payload = JSON.parse(body);
    } catch {
      return invalidUpstreamResponse();
    }

    return jsonApiResponse(payload, {
      status: upstream.status,
      cacheControl: upstream.ok
        ? `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=60`
        : "no-store",
    });
  } catch {
    return jsonApiResponse(
      {
        success: false,
        data: null,
        message: "A API de canais está indisponível.",
      },
      { status: 503 },
    );
  }
}
