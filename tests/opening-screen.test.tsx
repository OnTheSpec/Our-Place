/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/voice-powered-orb", () => ({
  VoicePoweredOrb: () => <span data-testid="voice-heart-visual" aria-hidden="true" />,
}));

import { OurPlaceApp } from "@/app/our-place-app";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Our Place opening screen", () => {
  it("enters the established home experience", () => {
    render(<OurPlaceApp />);

    expect(screen.getByText("Our Place")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "The small things are how we stay close." })).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("A warm place to stay close")).toBeTruthy();
    expect(screen.getByAltText("A multigenerational family embracing together on their porch at golden-hour dusk")).toBeTruthy();
    expect(screen.getByText("Only what you approve is shared")).toBeTruthy();
    expect(screen.queryByText(/Good morning/i)).toBeNull();

    const steps = screen.getByText("Speak freely").closest(".opening-steps");
    expect(steps).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /See how it works/i }));
    expect(document.activeElement).toBe(steps);

    fireEvent.click(screen.getByRole("button", { name: "Enter Our Place" }));

    expect(screen.getByRole("heading", { level: 1, name: /Good morning,\s*Evelyn\./i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Talk about my day/i })).toBeTruthy();
    expect(screen.getByText("You were understood.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Call my family/i })).toBeTruthy();
  });

  it("starts and stops the semantic heart without completing a cancelled capture", () => {
    vi.useFakeTimers();
    render(<OurPlaceApp />);

    fireEvent.click(screen.getByRole("button", { name: "Enter Our Place" }));
    fireEvent.click(screen.getByRole("button", { name: /Talk about my day/i }));

    const idleHeart = screen.getByRole("button", { name: "Start speaking" });
    expect(idleHeart.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Tap to speak")).toBeTruthy();

    fireEvent.click(idleHeart);

    const listeningHeart = screen.getByRole("button", { name: "Stop listening" });
    expect(listeningHeart.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("I’m listening…")).toBeTruthy();

    fireEvent.click(listeningHeart);

    const stoppedHeart = screen.getByRole("button", { name: "Start speaking" });
    expect(stoppedHeart.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Tap to speak")).toBeTruthy();

    act(() => vi.advanceTimersByTime(1400));
    expect(screen.queryByText("I’m feeling pretty good today. The sunshine has been lovely.")).toBeNull();
    expect(screen.queryByText(/You’re feeling pretty good today/)).toBeNull();
  });
});
