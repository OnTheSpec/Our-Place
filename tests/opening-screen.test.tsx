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
  vi.unstubAllGlobals();
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
    expect(screen.getByText("Nothing from Sarah yet.")).toBeTruthy();
    expect(screen.queryByText(/I listened to what you shared/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Call my family|Remind me|Get help|Hear Sarah’s message/i })).toBeNull();
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

  it("keeps approval and family responses explicit within the client demo", async () => {
    const extraction = {
      summary: "Evelyn enjoyed the sunshine and would like her family to understand her day.",
      reflection: "The sunshine felt welcome today.",
      tone: "In Evelyn’s own words",
      safety_level: "routine",
      items: [],
    };
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => extraction })));
    render(<OurPlaceApp />);

    fireEvent.click(screen.getByRole("button", { name: "Enter Our Place" }));
    fireEvent.click(screen.getByRole("button", { name: /Talk about my day/i }));

    for (const answer of ["A calm morning.", "The sunshine stayed with me.", "I want my family to understand that."]) {
      fireEvent.click(screen.getByRole("button", { name: "I’d rather type" }));
      fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: answer } });
      fireEvent.click(screen.getByRole("button", { name: /Yes, you understood me/i }));
    }

    expect(await screen.findByRole("heading", { name: "Did we understand you?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Yes, this feels true to me" }));

    expect(screen.getByRole("heading", { name: "Your check-in is ready in this demo." })).toBeTruthy();
    expect(screen.getByText("Approved and ready in this demo")).toBeTruthy();
    expect(screen.getByText(/Nothing was delivered/i)).toBeTruthy();
    expect(screen.queryByText(/Shared with Sarah and Daniel/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Open the family side of this demo/i }));
    expect(screen.getByText("Evelyn approved this check-in")).toBeTruthy();
    expect(screen.queryByText(/shared 8 minutes ago/i)).toBeNull();

    const firstReaction = screen.getByRole("button", { name: /I hear you/i });
    expect(firstReaction.getAttribute("aria-pressed")).toBe("false");
    expect(document.querySelectorAll(".reaction-row .chosen")).toHaveLength(0);
    expect(screen.getByText("Choose a reaction to show what Evelyn would see in this demo.")).toBeTruthy();

    fireEvent.click(firstReaction);
    expect(firstReaction.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(firstReaction);
    expect(firstReaction.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: /I’m here with you/i }));

    const replyField = screen.getByRole("textbox", { name: "Write a reply for Evelyn" }) as HTMLTextAreaElement;
    const saveReply = screen.getByRole("button", { name: "Save reply in this demo" }) as HTMLButtonElement;
    expect(saveReply.disabled).toBe(true);
    fireEvent.change(replyField, { target: { value: "  I hear how much the sunshine meant today.  " } });
    expect(saveReply.disabled).toBe(false);
    fireEvent.click(saveReply);

    expect(screen.getByRole("status").textContent).toMatch(/saved in this demo/i);
    expect(replyField.value).toBe("  I hear how much the sunshine meant today.  ");
    expect(screen.getByRole("button", { name: "Save updated reply in this demo" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Demo: Evelyn’s view" }));
    expect(screen.getByText("I’m here with you")).toBeTruthy();
    expect(screen.getByText(/I hear how much the sunshine meant today\./).textContent).toBe("“I hear how much the sunshine meant today.”");
    expect(screen.queryByText(/I listened to what you shared/i)).toBeNull();
  });
});
