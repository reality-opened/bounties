import { contactMailtoHref } from "./contact";

export default function ContactSection() {
  return (
    <section id="contact" className="landing-section contact-section">
      <div className="container contact-inner">
        <div>
          <p className="section-kicker">For robotics teams</p>
          <h2 className="section-title contact-title">
            Build a grounded dataset from <em>real captures</em>
          </h2>
          <p className="section-lead contact-lead">
            Pilot a capture workflow for your environments, objects, and robot
            learning format targets.
          </p>
        </div>
        <a className="button-primary contact-button" href={contactMailtoHref}>
          Get in touch
        </a>
      </div>
    </section>
  );
}
