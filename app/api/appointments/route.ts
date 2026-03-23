import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const canonicalPath = "/api/public/[slug]/book";

  return NextResponse.json(
    {
      error: `POST /api/appointments has been deprecated. Use ${canonicalPath} instead.`,
      canonicalEndpoint: canonicalPath,
      docs: `${url.origin}${canonicalPath}`,
    },
    { status: 410 },
  );
}
