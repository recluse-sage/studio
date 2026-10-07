import { ServerRouter } from "react-router";
import { renderToReadableStream } from "react-dom/server";

// Custom server entry for Cloudflare workerd runtime.
// Lets `react-router typegen` and `react-router build` run without @react-router/node.
// Await allReady so prerender saves complete markup and surfaces render errors.
export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: React.ComponentProps<typeof ServerRouter>["context"],
) {
  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      signal: request.signal,
      onError() {
        responseStatusCode = 500;
      },
    },
  );
  await body.allReady;
  responseHeaders.set("Content-Type", "text/html; charset=utf-8");
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
