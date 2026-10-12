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
        Сайтът не използва аналитични или рекламни технологии. Данните за избора Ви и сесията за
        администраторски вход се съхраняват локално в браузъра. Единствената бисквитка от сайта
        запомня настройката на страничното меню в админ панела. Външни карти и видеа се зареждат
        само след Ваше съгласие.
      </p>
      <Button onClick={openCookiePreferences}>Промени настройките на бисквитките</Button>

      <h2>Списък</h2>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th scope="col">Име</th>
              <th scope="col">Вид</th>
              <th scope="col">Цел</th>
              <th scope="col">Срок</th>
              <th scope="col">Категория</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ella-consent-v1</td>
              <td>localStorage</td>
              <td>Запомня избора Ви за външно съдържание</td>
              <td>До изтриване</td>
              <td>Необходима</td>
            </tr>
            <tr>
              <td>sb-…-auth-token</td>
              <td>localStorage</td>
              <td>Сесия на вход в админ панела (само за служители)</td>
              <td>До изход, изтичане на сесията или изтриване на данните на сайта</td>
              <td>Необходима</td>
            </tr>
            <tr>
              <td>sidebar_state</td>
              <td>Бисквитка от сайта</td>
              <td>Запомня дали страничното меню на админ панела е отворено</td>
              <td>7 дни</td>
              <td>Необходима</td>
            </tr>
            <tr>
              <td>Google Maps, YouTube / Vimeo</td>
              <td>Възможни бисквитки или подобни идентификатори на трета страна</td>
              <td>Показване на карта или видео</td>
              <td>Според доставчика</td>
              <td>Външно съдържание (само след съгласие)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Как да оттеглите съгласие</h2>
      <p>
        Използвайте бутона по-горе или връзката „Настройки на бисквитките“ в долната част на всяка
        страница. Можете и да изтриете данните на сайта от настройките на браузъра си.
      </p>
      <p>
        При оттегляне на съгласието вграденото външно съдържание се премахва от страницата и не се
        зарежда отново. Вече създадени данни при външен доставчик се управляват от него или от
        настройките на браузъра Ви.
      </p>
    </LegalLayout>
  );
}
