import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { isTypingTarget } from "@/input/sources/keyboard";
import { Knob, knobKeyStep } from "./knob";

function Harness({
  initial = 0.5,
  onChange,
}: {
  initial?: number;
  onChange?: (n: number) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <Knob
      label="Corte"
      value={value}
      defaultValue={0.25}
      valueText={`${Math.round(value * 100)} u`}
      onValueChange={(n) => {
        setValue(n);
        onChange?.(n);
      }}
    />
  );
}

const slider = () => screen.getByRole("slider", { name: "Corte" });
const now = () => Number(slider().getAttribute("aria-valuenow"));

describe("Knob (S013–S019)", () => {
  it("is a slider from 0 to 100 with its name and value text", () => {
    render(<Harness initial={0.42} />);
    expect(slider()).toHaveProperty("tabIndex", 0);
    expect(slider().getAttribute("aria-valuemin")).toBe("0");
    expect(slider().getAttribute("aria-valuemax")).toBe("100");
    expect(now()).toBe(42);
    expect(slider().getAttribute("aria-valuetext")).toBe("42 u");
  });

  it("steps with the arrow, Page, Home and End keys (S017)", () => {
    render(<Harness />);
    fireEvent.keyDown(slider(), { key: "ArrowUp" });
    expect(now()).toBe(52);
    fireEvent.keyDown(slider(), { key: "ArrowLeft" });
    fireEvent.keyDown(slider(), { key: "ArrowLeft" });
    expect(now()).toBe(48);
    fireEvent.keyDown(slider(), { key: "PageUp" });
    expect(now()).toBe(58);
    fireEvent.keyDown(slider(), { key: "PageDown" });
    fireEvent.keyDown(slider(), { key: "PageDown" });
    expect(now()).toBe(38);
    fireEvent.keyDown(slider(), { key: "End" });
    expect(now()).toBe(100);
    fireEvent.keyDown(slider(), { key: "ArrowRight" });
    expect(now()).toBe(100);
    fireEvent.keyDown(slider(), { key: "Home" });
    expect(now()).toBe(0);
  });

  it("resets to its default on a double-click (S018)", () => {
    render(<Harness initial={0.9} />);
    fireEvent.doubleClick(slider());
    expect(now()).toBe(25);
  });

  it("moves 2.5 % per wheel step and 0.5 % with Shift (S016)", () => {
    render(<Harness />);
    fireEvent.wheel(slider(), { deltaY: -100 });
    expect(slider().getAttribute("aria-valuenow")).toBe("53"); // 52.5 rounds up
    fireEvent.wheel(slider(), { deltaY: 100, shiftKey: true });
    expect(now()).toBe(52);
  });

  it("does not take the letter keys away from the note keys", () => {
    render(<Harness />);
    expect(isTypingTarget(slider())).toBe(false);
  });

  it("ignores other keys", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.keyDown(slider(), { key: "a" });
    expect(onChange).not.toHaveBeenCalled();
    expect(knobKeyStep("Enter", 0.5)).toBeNull();
  });
});
