import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { openCookiePreferences, saveConsent, useConsent } from "@/lib/consent";

/** Renders third-party embeds only after "media" consent. */
export function ConsentEmbed({
  children,
  service,
  fallbackHref,
  className = "",
}: {
  children: ReactNode;
  service: string;
  fallbackHref?: string;
  className?: string;
}) {
  const { consent, ready } = useConsent();
  if (ready && consent?.media) return <>{children}</>;
  return (
    <div className={`grid h-full min-h-[200px] place-items-center bg-muted p-6 text-center ${className}`}>
      <div className="max-w-sm">
        <p className="text-sm text-muted-foreground">
          Това съдържание се зарежда от {service}, който може да постави бисквитки. Показва се само с
          Ваше съгласие.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button size="sm" onClick={() => saveConsent(true)}>Зареди съдържанието</Button>
          <Button size="sm" variant="outline" onClick={openCookiePreferences}>Настройки</Button>
        </div>
        {fallbackHref && (
          <a href={fallbackHref} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm underline underline-offset-2 text-foreground">
            Отвори в нов прозорец
          </a>
        )}
      </div>
    </div>
  );
}






