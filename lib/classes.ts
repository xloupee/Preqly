import { mapClassRow, type ClassRecord, type ClassRow } from "@/lib/class-record";
import { createClient } from "@/lib/supabase/server";

type ClassListResult = {
  user: { id: string; email: string | null } | null;
  classes: ClassRecord[];
  schemaReady: boolean;
  schemaMessage: string | null;
};

function isMissingClassSchema(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("could not find the table") ||
    normalized.includes("relation \"public.classes\" does not exist") ||
    normalized.includes("schema cache")
  );
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export async function listClassesForCurrentUser() {
  if (!isSupabaseConfigured()) {
    return {
      user: null,
      classes: [] as ClassRecord[],
      schemaReady: false,
      schemaMessage: "Supabase is not configured yet.",
    } satisfies ClassListResult;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      classes: [] as ClassRecord[],
      schemaReady: true,
      schemaMessage: null,
    } satisfies ClassListResult;
  }

  const normalizedUser = {
    id: user.id,
    email: user.email ?? null,
  };

  const { data, error } = await supabase
    .from("classes")
    .select("id, user_id, title, syllabus_path, syllabus_filename, status, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingClassSchema(error.message)) {
      return {
        user: normalizedUser,
        classes: [] as ClassRecord[],
        schemaReady: false,
        schemaMessage: "Run the latest Supabase migration to enable class storage.",
      } satisfies ClassListResult;
    }

    throw new Error(error.message);
  }

  return {
    user: normalizedUser,
    classes: (data ?? []).map((row) => mapClassRow(row as ClassRow)),
    schemaReady: true,
    schemaMessage: null,
  } satisfies ClassListResult;
}
