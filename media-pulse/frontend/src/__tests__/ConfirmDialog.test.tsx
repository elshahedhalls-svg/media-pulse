import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";

describe("ConfirmDialog", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        title="Delete?"
        message="Are you sure?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders alertdialog with title, message and actions when open", () => {
    render(
      <ConfirmDialog
        isOpen
        title="Remove from tracking?"
        message="Remove MyApp from tracking?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Remove from tracking?")).toBeInTheDocument();
    expect(screen.getByText("Remove MyApp from tracking?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onConfirm and onCancel", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen
        title="Delete?"
        message="Sure?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("closes on Escape", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen
        title="Delete?"
        message="Sure?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalled();
  });
});

describe("EmptyState", () => {
  it("renders title and action", () => {
    render(
      <EmptyState
        title="No apps yet"
        description="Search and add one"
        action={<button>Add app</button>}
      />
    );
    expect(screen.getByText("No apps yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add app" })).toBeInTheDocument();
  });
});
