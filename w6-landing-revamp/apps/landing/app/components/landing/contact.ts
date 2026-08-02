// NOTE (bounty kit W6): the production file hard-codes a real, personal
// inbox here. That address is not for external eyes, so this kit replaces it
// with a placeholder. `contactMailtoHref`'s shape (a `mailto:` link with a
// prefilled subject + body) and its export name are unchanged, so
// HeroSection.tsx and ContactSection.tsx — its only two importers — need no
// changes of their own.
const CONTACT_EMAIL = "hello@example.invalid";

const CONTACT_SUBJECT = "Open Reality - robotics data pilot";
const CONTACT_BODY =
  "Hi Open Reality,\n\nWe are interested in a robotics data pilot.\n\nCompany:\nUse case:\nWhat we need captured:\n";

// Shared so the hero CTA and the contact section open the same prefilled email.
export const contactMailtoHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  CONTACT_SUBJECT,
)}&body=${encodeURIComponent(CONTACT_BODY)}`;
