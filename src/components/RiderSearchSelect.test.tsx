import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RiderSearchSelect from "./RiderSearchSelect";

describe("RiderSearchSelect", () => {
  it("houdt het geportale keuzemenu aanklikbaar in een modal", () => {
    const onChange = vi.fn();
    render(
      <RiderSearchSelect
        riders={[{
          id: "wlodarczyk",
          name: "Dominika Wlodarczyk",
          start_number: 31,
          teamName: "UAE Team ADQ",
        }]}
        value=""
        onChange={onChange}
      />,
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "31" } });

    const option = screen.getByRole("button", { name: /Dominika Wlodarczyk/i });
    expect(option.closest(".fixed")).toHaveClass("pointer-events-auto");
    fireEvent.click(option);
    expect(onChange).toHaveBeenCalledWith("wlodarczyk");
  });
});
