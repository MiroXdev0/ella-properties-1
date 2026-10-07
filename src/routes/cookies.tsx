import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { legalHead } from "@/lib/seo";
import { openCookiePreferences } from "@/lib/consent";

export const Route = createFileRoute("/cookies")({
  head: () =>
    legalHead(
      "Политика за бисквитките — Елла Недвижими Имоти",
      "Какви бисквитки и локално съхранение използва сайтът на Елла Недвижими Имоти и как да промените избора си.",
      "/cookies",
    ),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <LegalLayout title="Политика за бисквитките">
      <p>
        Сайтът не използва аналитични или рекламни бисквитки. Използваме само необходимо локално
        съхранение. Външно съдържание (карти и видеа) се зарежда единствено след Ваше съгласие.
      </p>
      <Button onClick={openCookiePreferences}>Промени настройките на бисквитките</Button>

      <h2>Списък</h2>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr><th scope="col">Име</th><th scope="col">Вид</th><th scope="col">Цел</th><th scope="col">Срок</th><th scope="col">Категория</th></tr>
          </thead>
          <tbody>
            <tr><td>ella-consent-v1</td><td>localStorage</td><td>Запомня избора Ви за бисквитки</td><td>До изтриване</td><td>Необходима</td></tr>
            <tr><td>sb-…-auth-token</td><td>localStorage</td><td>Сесия на вход в админ панела (само за служители)</td><td>До изход</td><td>Необходима</td></tr>
            <tr><td>Бисквитки на Google Maps</td><td>Бисквитки на трета страна</td><td>Показване на карта</td><td>Според Google</td><td>Външно съдържание (съгласие)</td></tr>
            <tr><td>Бисквитки на YouTube / Vimeo</td><td>Бисквитки на трета страна</td><td>Възпроизвеждане на видео</td><td>Според доставчика</td><td>Външно съдържание (съгласие)</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Как да оттеглите съгласие</h2>
      <p>
        Използвайте бутона по-горе или връзката „Настройки на бисквитките“ в долната част на всяка
        страница. Можете и да изтриете данните на сайта от настройките на браузъра си.
      </p>
    </LegalLayout>
  );
}



