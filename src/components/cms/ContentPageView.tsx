import { useLanguage } from "@/i18n/LanguageProvider";
import type { PageContent } from "@/lib/site-pages";

export function ContentPageView({ content }: { content: PageContent }) {
  const { language } = useLanguage();
  const copy = content[language].title || content[language].body ? content[language] : content.bg;
  const paragraphs = copy.body.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);

  return (
    <article className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:py-20">
      <h1 className="font-display text-4xl leading-tight text-navy sm:text-5xl">{copy.title}</h1>
      <div className="mt-8 space-y-5 text-base leading-8 text-foreground/80 sm:text-lg">
        {paragraphs.map((paragraph, index) => <p key={index} className="whitespace-pre-wrap">{paragraph}</p>)}
      </div>
    </article>
  );
}
