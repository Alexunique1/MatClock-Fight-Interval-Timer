const MICROSOFT_STORE_URL =
  "https://apps.microsoft.com/detail/9PP18VZ1FV5M?hl=neutral&gl=BG&ocid=pdpshare";
const YOUTUBE_URL = "https://www.youtube.com/@maxusbjj";

export function AboutSection() {
  return (
    <section className="about-section" id="about" aria-labelledby="about-title">
      <div className="about-inner">
        <div className="about-heading">
          <p className="about-kicker">About MatClock</p>
          <h2 id="about-title">Built on the mat, for the mat.</h2>
        </div>

        <div className="about-copy">
          <p className="about-lede">
            We are a father and son who both train Brazilian jiu-jitsu. We created MatClock because we
            wanted a simple, reliable interval timer for our own rounds, and a useful tool we could
            share with teammates, coaches, and fellow athletes.
          </p>

          <div className="about-details">
            <p>
              What started on the BJJ mats has grown into a timer for boxing, MMA, Muay Thai, HIIT,
              and other round-based training.
            </p>
            <p>
              We use MatClock ourselves and continue improving it with feedback from the community.
              Try it during your next training session and let us know what works, what could be
              better, and which features you would like us to add.
            </p>
          </div>

          <p className="about-thanks">
            Thank you for supporting MatClock. Train hard and make every round count.
          </p>

          <p className="about-youtube-copy">
            Follow our BJJ journey and training content on YouTube.
          </p>

          <div className="about-actions" aria-label="MatClock links">
            <a
              className="about-action about-action-primary"
              href={MICROSOFT_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Install MatClock
            </a>
            <a
              className="about-action"
              href="mailto:support@matclock.online?subject=MatClock%20feedback"
            >
              Share Feedback
            </a>
            <a
              className="about-action"
              href={YOUTUBE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Watch on YouTube
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
