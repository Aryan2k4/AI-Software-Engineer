import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { FirstVisitBanner } from "@/components/common/FirstVisitBanner";

const STORAGE_KEY = "ase_banner_dismissed";

describe("FirstVisitBanner", () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it("shows when projectCount is 0 and not dismissed", () => {
    render(<FirstVisitBanner projectCount={0} />);
    expect(screen.getByText("Welcome to AI Software Engineer")).toBeInTheDocument();
  });

  it("does not show when projectCount > 0", () => {
    render(<FirstVisitBanner projectCount={3} />);
    expect(screen.queryByText("Welcome to AI Software Engineer")).toBeNull();
  });

  it("does not show when already dismissed", () => {
    localStorage.setItem(STORAGE_KEY, "1");
    render(<FirstVisitBanner projectCount={0} />);
    expect(screen.queryByText("Welcome to AI Software Engineer")).toBeNull();
  });

  it("dismisses on X click and sets localStorage", () => {
    render(<FirstVisitBanner projectCount={0} />);
    fireEvent.click(screen.getByLabelText("Dismiss"));
    expect(localStorage.getItem(STORAGE_KEY)).toBe("1");
  });
});
