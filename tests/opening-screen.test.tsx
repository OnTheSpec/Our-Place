/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { OurPlaceApp } from "@/app/our-place-app";

afterEach(cleanup);

describe("Our Place opening screen", () => {
  it("enters the established home experience", () => {
    render(<OurPlaceApp />);

    expect(screen.getByRole("heading", { level: 1, name: "Our Place" })).toBeTruthy();
    expect(screen.getByText("A warm place to stay close")).toBeTruthy();
    expect(screen.queryByText(/Good morning/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Enter Our Place" }));

    expect(screen.getByRole("heading", { level: 1, name: /Good morning,\s*Evelyn\./i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Talk about my day/i })).toBeTruthy();
    expect(screen.getByText("You were understood.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Call my family/i })).toBeTruthy();
  });
});
