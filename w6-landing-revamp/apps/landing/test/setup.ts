import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Replace driver.js with spies so tests never need a real DOM tour.
vi.mock("driver.js", () => ({
  driver: vi.fn(() => ({ drive: vi.fn(), destroy: vi.fn() })),
}));

// Default Clerk hook mocks (anonymous). Individual tests override useUser.
vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn(() => ({ isLoaded: true, isSignedIn: false, user: null })),
  useAuth: vi.fn(() => ({ getToken: vi.fn() })),
  useClerk: vi.fn(() => ({ openSignIn: vi.fn(), openSignUp: vi.fn() })),
}));
