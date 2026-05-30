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
  const title = type === "privacy" ? "Privacy Policy for MatClock" : dictionary.cookiesTitle;
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
        {type === "privacy" ? (
          <div className="policy-date-group">
            <p className="policy-date">Effective Date: May 30, 2026</p>
            <p className="policy-date">Last Updated: May 30, 2026</p>
          </div>
        ) : (
          <p className="policy-date">{dictionary.policyUpdated}</p>
        )}
        {type === "privacy" ? (
          <PrivacyPolicyContent />
        ) : (
          <>
            <p>{body}</p>
            <p>
              {dictionary.contact}:{" "}
              <a href="mailto:support@matclock.online">support@matclock.online</a>
            </p>
          </>
        )}
      </section>
      <SiteFooter dictionary={dictionary} locale={locale} onLocaleChange={handleLocaleChange} />
    </main>
  );
}

function PrivacyPolicyContent() {
  return (
    <div className="policy-content">
      <p>
        Welcome to MatClock Fight Interval Timer ("MatClock", "we", "us", or "our"). We
        respect your privacy and are committed to protecting it. This Privacy Policy
        applies to our web application available at{" "}
        <a href="https://matclock.online">https://matclock.online</a> and our desktop
        application distributed via the Microsoft Store.
      </p>

      <p>
        Unlike many other services, MatClock does not require a user account,
        registration, or login. We do not collect, store, or process your personal data
        directly, such as your name, email address, training logs, or custom timer
        settings. All timer configurations are stored locally on your device.
      </p>

      <h2>1. Information We Collect and Use</h2>
      <p>
        MatClock does not ask you to provide personally identifiable information to use
        the timer. Any timer settings, profiles, imported sounds, or workout
        configurations you create are retained on your device and are not collected by
        us in any way.
      </p>

      <h2>2. Third-Party Analytics for the Web Version</h2>
      <p>
        To understand how users interact with our web version and to improve the
        application, we may use Google Analytics. Google Analytics may automatically
        collect certain non-personal usage and technical information when you visit our
        website, including:
      </p>
      <ul>
        <li>Device and browser data: operating system, browser type, device type, and screen resolution.</li>
        <li>Geo-location data: general geographic location, such as country and city level based on IP address.</li>
        <li>Usage data: pages viewed, time spent on the web app, and interactions with timer features.</li>
      </ul>
      <p>
        Google Analytics may use cookies or similar technologies to collect this data.
        You can accept, decline, block, or delete cookies through your browser settings
        where supported.
      </p>

      <h2>3. Microsoft Store and Purchases</h2>
      <p>
        The desktop version of MatClock available on the Microsoft Store requires a
        one-time purchase.
      </p>
      <p>
        No financial data is collected by us. All transactions and payment processing
        are handled exclusively by Microsoft.
        We never receive, view, or store your credit card information, billing address,
        or payment details.
      </p>
      <p>
        No MatClock account is required.
        The desktop app runs locally and does not transmit your timer profiles,
        settings, or training data to our servers.
      </p>

      <h2>4. Data Storage</h2>
      <p>
        All data related to your custom intervals, rounds, timer configurations, and
        custom desktop sound files is saved locally on your device, via browser
        LocalStorage for the web version or local app configuration files for the
        desktop version. If you clear your browser data or uninstall the desktop app,
        this data may be deleted. We have no access to it.
      </p>

      <h2>5. Future Mobile Apps, Advertising Networks, and Service Providers</h2>
      <p>
        MatClock may release mobile applications in the future. Those mobile apps may
        use third-party services for app distribution, analytics, crash reporting, or
        advertising, such as Google Play Services, AdMob, Google Analytics for Firebase,
        Firebase Crashlytics, or other advertising mediation providers.
      </p>
      <p>
        We may employ third-party companies and services for the following reasons:
      </p>
      <ul>
        <li>To facilitate our service.</li>
        <li>To provide distribution, analytics, crash reporting, or advertising services.</li>
        <li>To assist us in understanding how MatClock is used and how it can be improved.</li>
      </ul>
      <p>
        These third-party services may collect information used to identify you,
        depending on their own privacy policies and the platform where you use MatClock.
        If mobile apps, advertising, crash reporting, or additional analytics services
        are introduced, this Privacy Policy will be updated before those features are
        enabled or before the relevant app version is released.
      </p>

      <h2>6. Log Data and Crash Reports</h2>
      <p>
        The current web and desktop versions of MatClock do not send crash reports or
        diagnostic logs to our servers. In future mobile versions, if an error occurs,
        third-party crash reporting tools may collect log data such as device IP
        address, device name, operating system version, app configuration, time and date
        of use, and other diagnostic statistics. This will be disclosed before such
        tools are enabled.
      </p>

      <h2>7. Cookies</h2>
      <p>
        Cookies are files with a small amount of data that are commonly used as
        anonymous unique identifiers. These are sent to your browser from websites that
        you visit and are stored on your device.
      </p>
      <p>
        MatClock may use local browser storage to remember timer settings and language
        preferences. The service does not use advertising cookies in the initial web
        release. However, Google Analytics, Google AdSense, or other third-party code
        and libraries may use cookies or similar technologies to collect information and
        improve their services. You can accept or refuse cookies through your browser
        settings. If you refuse cookies, some portions of the service may not function as
        intended.
      </p>

      <h2>8. Children's Privacy</h2>
      <p>
        MatClock is designed for use by individuals of all ages. We do not knowingly
        collect personally identifiable information from children under the age of 13.
      </p>

      <h2>9. Security</h2>
      <p>
        We value your trust and aim to use commercially reasonable means to protect any
        information handled by the services we use. However, no method of transmission
        over the internet or method of electronic storage is 100% secure, and we cannot
        guarantee absolute security.
      </p>

      <h2>10. Changes to This Privacy Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Any changes will be posted
        on this page with an updated "Last Updated" date. We encourage you to review
        this Privacy Policy periodically.
      </p>

      <h2>11. Contact Us</h2>
      <p>
        If you have any questions or feedback regarding this Privacy Policy, please
        contact us at:{" "}
        <a href="mailto:support@matclock.online">support@matclock.online</a>
      </p>
    </div>
  );
}
