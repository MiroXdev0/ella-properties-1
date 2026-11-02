import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { ErrorExperience } from "@/components/error/ErrorExperience";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { getErrorExperienceKind } from "@/lib/error-experience";
import { PwaManager } from "@/components/pwa/PwaManager";

function NotFoundComponent() {
  return <ErrorExperience kind="notFound" />;
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  if (typeof window === "undefined") console.error(error);
  else console.error("[app] An unexpected client-side error occurred");
  const router = useRouter();
  const kind = getErrorExperienceKind(error);
  return (
    <ErrorExperience
      kind={kind}
      onRetry={
        kind === "server" || kind === "connection"
          ? async () => {
              await router.invalidate();
              reset();
            }
          : undefined
      }
    />
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Елла Недвижими Имоти — актуални обяви за имоти" },
      {
        name: "description",
        content:
          "Елла Недвижими Имоти — актуални обяви за продажба и наем на имоти в градовете с публикувани оферти.",
      },
      { name: "author", content: "Елла Недвижими Имоти" },
      { property: "og:title", content: "Елла Недвижими Имоти — актуални обяви за имоти" },
      {
        property: "og:description",
        content: "Актуални обяви и съдействие при покупка, продажба и отдаване под наем на имоти.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Елла Недвижими Имоти" },
      { property: "og:locale", content: "bg_BG" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0B1E3B" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Елла Имоти" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: "/logo.ico?v=20261015",
        type: "image/x-icon",
      },
      {
        rel: "manifest",
        href: "/manifest.webmanifest?v=20261016-pwa",
      },
      {
        rel: "apple-touch-icon",
        href: "/logo-mobile-maskable-192.png",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="bg">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}

        {/* Cloudflare Web Analytics */}
        <script
          type="module"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "ee22a0b80a5a4438a06a1f2c70d23c92"}'
        />

        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <PwaManager>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <ConsentBanner />
        </PwaManager>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
