interface FinalCtaProps {
  ctaDisabled: boolean;
  isSignedIn: boolean;
  onStartScanning: () => void;
  onCreateAccount: () => void;
}

export default function FinalCta({
  ctaDisabled,
  isSignedIn,
  onStartScanning,
  onCreateAccount,
}: FinalCtaProps) {
  return (
    <section className="landing-section final-cta">
      <div className="container">
        <p className="section-kicker">Begin</p>
        <h2 className="section-title final-cta-title">
          Open <em>your</em> reality.
        </h2>
        <p className="section-lead final-cta-lead">
          A few minutes of walking is enough to map a space you can revisit,
          search, and question.
        </p>
        <div className="cta-row final-cta-row">
          <button
            className="button-primary"
            type="button"
            disabled={ctaDisabled}
            onClick={onStartScanning}
          >
            Start scanning
          </button>
          {!isSignedIn ? (
            <button
              className="btn-secondary"
              type="button"
              disabled={ctaDisabled}
              onClick={onCreateAccount}
            >
              Create account
            </button>
          ) : null}
        </div>
        <p className="landing-footer-stamp">
          <span>Open Reality</span>
          <span>VGGT-SLAM 2.0 · SL(4) · CLIP · SAM3</span>
        </p>
      </div>
    </section>
  );
}
