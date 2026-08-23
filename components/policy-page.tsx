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
            <p className="policy-date">Last Updated: August 23, 2026</p>
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
        <a href="https://matclock.online">https://matclock.online</a>, our desktop
        application distributed via the Microsoft Store, and our Android application.
      </p>

      <p>
        Unlike many other services, MatClock does not require a user account,
        registration, or login. We do not collect, store, or process your personal data
        directly, such as your name, email address, training logs, or custom timer
        settings. Timer configurations are stored locally on your device.
      </p>

      <h2>1. Information We Collect and Use</h2>
      <p>
        MatClock does not ask you to provide personally identifiable information to use
        the timer. Timer settings, profiles, and workout configurations are retained on
        your device and are not collected by us. Custom sound files supported by the
        desktop application also remain on your device.
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

      <h2>4. Android App and Voice Control</h2>
      <p>
        Voice control in the Android app is optional and disabled by default. If you
        enable it, MatClock asks for microphone permission and passes microphone audio
        to the speech recognition service configured on your Android device. Depending
        on that service and your device settings, recognition may happen on the device
        or the service provider may process audio on its servers. The provider's privacy
        policy applies to that processing.
      </p>
      <p>
        MatClock uses the recognition result only to match timer commands such as start,
        pause, resume, and reset. We do not receive or store microphone audio or voice
        transcripts on MatClock servers. The latest recognized phrase may be shown
        temporarily on the timer screen.
      </p>

      <h2>5. Data Storage</h2>
      <p>
        Data related to your custom intervals, rounds, timer configurations, and
        preferences is saved locally on your device, using browser LocalStorage for the
        web version or local application storage for the desktop and Android versions.
        Custom desktop sound files are also stored locally. If you clear app or browser
        data or uninstall an application, this data may be deleted. We have no access to
        it.
      </p>

      <h2>6. Android Distribution, Advertising, and Analytics</h2>
      <p>
        The initial Android release does not include an advertising SDK, an in-app
        analytics SDK, or a third-party crash-reporting SDK. Google Play and Android may
        independently process store, installation, security, and device diagnostic data
        under Google's privacy policies. If MatClock later introduces advertising,
        in-app analytics, crash reporting, or another service provider, this Privacy
        Policy will be updated before the relevant feature or app version is released.
      </p>

      <h2>7. Log Data and Crash Reports</h2>
      <p>
        The current web, desktop, and Android versions of MatClock do not send crash
        reports or diagnostic logs to MatClock servers. The application stores timer
        preferences locally. Platform providers such as Microsoft, Google Play, or
        Android may collect platform-level diagnostics according to their own settings
        and privacy policies.
      </p>

      <h2>8. Cookies</h2>
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

      <h2>9. Children's Privacy</h2>
      <p>
        MatClock is intended for athletes, coaches, and fitness users aged 13 and older.
        It is not designed for children under 13. We do not knowingly collect personally
        identifiable information from children under the age of 13.
      </p>

      <h2>10. Security</h2>
      <p>
        We value your trust and aim to use commercially reasonable means to protect any
        information handled by the services we use. However, no method of transmission
        over the internet or method of electronic storage is 100% secure, and we cannot
        guarantee absolute security.
      </p>

      <h2>11. Changes to This Privacy Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Any changes will be posted
        on this page with an updated "Last Updated" date. We encourage you to review
        this Privacy Policy periodically.
      </p>

      <h2>12. Contact Us</h2>
      <p>
        If you have any questions or feedback regarding this Privacy Policy, please
        contact us at:{" "}
        <a href="mailto:support@matclock.online">support@matclock.online</a>
      </p>
    </div>
  );
}
