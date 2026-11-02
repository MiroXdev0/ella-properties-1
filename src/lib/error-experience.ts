export type ErrorExperienceKind = "notFound" | "access" | "server" | "connection" | "maintenance";

export function getErrorExperienceKind(error: unknown): ErrorExperienceKind {
  if (typeof error === "object" && error !== null) {
    const record = error as {
      status?: unknown;
      statusCode?: unknown;
      name?: unknown;
      message?: unknown;
    };
    const status = record.statusCode ?? record.status;
    if (status === 404) return "notFound";
    if (status === 403) return "access";
    if (status === 503) return "connection";
    if (
      record.name === "NetworkError" ||
      (record.name === "TypeError" &&
        typeof record.message === "string" &&
        /failed to fetch|fetch failed|networkerror|load failed|network request failed/i.test(
          record.message,
        ))
    ) {
      return "connection";
    }
  }
  return "server";
}
