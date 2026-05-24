"use client";

import Link from "next/link";
import { Dictionary, Locale, localeLabels, locales } from "@/lib/i18n";

type SiteFooterProps = {
  dictionary: Dictionary;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
};

export function SiteFooter({ dictionary, locale, onLocaleChange }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <p className="footer-brand">MatClock</p>
          <p className="footer-muted">{dictionary.noAdsRule}</p>
        </div>

        <div className="footer-links">
          <Link href="/privacy">{dictionary.privacy}</Link>
          <Link href="/cookies">{dictionary.cookies}</Link>
        </div>

        <label className="language-select">
          <span aria-hidden>◎</span>
          <select value={locale} onChange={(event) => onLocaleChange(event.target.value as Locale)}>
            {locales.map((item) => (
              <option key={item} value={item}>
                {localeLabels[item]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </footer>
  );
}
