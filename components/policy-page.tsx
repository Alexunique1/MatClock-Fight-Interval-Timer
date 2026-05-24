"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  dictionaries,
  Dictionary,
  isRtl,
  Locale,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
} from "@/lib/i18n";
import { PwaRegister } from "./pwa-register";
import { SiteFooter } from "./site-footer";

type PolicyPageProps = {
  type: "privacy" | "cookies";
};

export function PolicyPage({ type }: PolicyPageProps) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    setLocale(saved ? normalizeLocale(saved) : "en");
    localStorage.removeItem("matclock-locale");
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";
  }, [locale]);

  const handleLocaleChange = (nextLocale: Locale) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    setLocale(nextLocale);
  };

  const dictionary: Dictionary = useMemo(() => dictionaries[locale], [locale]);
  const title = type === "privacy" ? dictionary.privacyTitle : dictionary.cookiesTitle;
  const body = type === "privacy" ? dictionary.privacyBody : dictionary.cookiesBody;

  return (
    <main className="app-shell policy-shell">
      <PwaRegister />
      <section className="policy-card">
        <Link className="back-link" href="/">
          ← {dictionary.home}
        </Link>
        <img className="policy-logo" src="/images/logo.png" alt="MatClock" />
        <h1>{title}</h1>
        <p className="policy-date">{dictionary.policyUpdated}</p>
        <p>{body}</p>
        <p>
          {dictionary.contact}:{" "}
          <a href="mailto:support@matclock.online">support@matclock.online</a>
        </p>
      </section>
      <SiteFooter dictionary={dictionary} locale={locale} onLocaleChange={handleLocaleChange} />
    </main>
  );
}
