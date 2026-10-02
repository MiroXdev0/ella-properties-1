import { redirect } from "@tanstack/react-router";

export function requireAdmin(context: { isAdmin?: boolean }) {
  if (!context.isAdmin) {
    throw redirect({ to: "/admin" });
  }
}





