import { NextResponse } from "next/server";

import { loadPersonalGraphVersionsForCurrentUser } from "@/lib/personal-graph-versions";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to view graph history." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mapKey = searchParams.get("mapKey");

  if (!mapKey) {
    return NextResponse.json({ error: "Provide a map key." }, { status: 400 });
  }

  const historyState = await loadPersonalGraphVersionsForCurrentUser(mapKey);

  return NextResponse.json({
    versions: historyState.versions,
    historySchemaReady: historyState.schemaReady,
    historyMessage: historyState.schemaMessage,
  });
}
