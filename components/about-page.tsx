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
import { AboutSection } from "./about-section";
import { PwaRegister } from "./pwa-register";
import { SiteFooter } from "./site-footer";

export function AboutPage() {
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

  return (
    <main className="app-shell about-page-shell">
      <PwaRegister />

      <header className="top-app-bar">
        <Link className="header-logo" href="/" aria-label="MatClock timer">
          <img src="/images/logo.png" alt="MatClock" />
        </Link>
        <nav className="desktop-nav" aria-label="Primary">
          <Link href="/">{dictionary.home}</Link>
          <Link href="/about" aria-current="page">
            {dictionary.about}
          </Link>
        </nav>
        <div className="about-header-spacer" aria-hidden="true" />
      </header>

      <AboutSection dictionary={dictionary} />
      <SiteFooter dictionary={dictionary} locale={locale} onLocaleChange={handleLocaleChange} />
    </main>
  );
}
