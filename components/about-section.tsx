import type { Dictionary } from "@/lib/i18n";

const MICROSOFT_STORE_URL =
  "https://apps.microsoft.com/detail/9PP18VZ1FV5M?hl=neutral&gl=BG&ocid=pdpshare";
const YOUTUBE_URL = "https://www.youtube.com/@maxusbjj";

export function AboutSection({ dictionary }: { dictionary: Dictionary }) {
  return (
    <section className="about-section" id="about" aria-labelledby="about-title">
      <div className="about-inner">
        <div className="about-heading">
          <p className="about-kicker">{dictionary.aboutKicker}</p>
          <h1 id="about-title">{dictionary.aboutHeadline}</h1>
        </div>

        <div className="about-copy">
          <p className="about-lede">{dictionary.aboutIntro}</p>

          <div className="about-details">
            <p>{dictionary.aboutOrigins}</p>
            <p>{dictionary.aboutFeedback}</p>
          </div>

          <p className="about-thanks">{dictionary.aboutThanks}</p>

          <p className="about-youtube-copy">{dictionary.aboutYoutube}</p>

          <div className="about-actions" aria-label="MatClock links">
            <a
              className="about-action about-action-primary"
              href={MICROSOFT_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {dictionary.aboutInstall}
            </a>
            <a
              className="about-action"
              href="mailto:support@matclock.online?subject=MatClock%20feedback"
            >
              {dictionary.aboutShareFeedback}
            </a>
            <a
              className="about-action"
              href={YOUTUBE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {dictionary.aboutWatchYoutube}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
