import { createContext, useContext } from "react";

export type PwaContextValue = {
  isInstalled: boolean;
  canPromptInstall: boolean;
  requestInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

export const PwaContext = createContext<PwaContextValue | null>(null);

export function usePwa() {
  const context = useContext(PwaContext);
  if (!context) throw new Error("usePwa must be used inside PwaManager");
  return context;
}
