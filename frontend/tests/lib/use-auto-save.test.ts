import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutoSave } from "@/lib/use-auto-save";

const { createMock, updateMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/saved-documents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/saved-documents")>()),
  createSavedDocument: createMock,
  updateSavedDocument: updateMock,
}));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  createMock.mockReset();
  updateMock.mockReset();
});

const DATA = { fields: { Provider: "Acme" }, transcript: [] };

function renderAutoSave(overrides: Partial<Parameters<typeof useAutoSave>[0]> = {}) {
  const props = {
    initialId: null as number | null,
    documentKey: "csa" as string | null,
    title: "CSA",
    data: DATA,
    enabled: true,
    ...overrides,
  };
  return renderHook((p: Parameters<typeof useAutoSave>[0]) => useAutoSave(p), {
    initialProps: props,
  });
}

describe("useAutoSave", () => {
  it("creates after the debounce, then updates on later changes", async () => {
    createMock.mockResolvedValue({ id: 7 });
    updateMock.mockResolvedValue({ id: 7 });
    const hook = renderAutoSave();

    expect(createMock).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    expect(createMock).toHaveBeenCalledWith({
      documentKey: "csa",
      title: "CSA",
      data: DATA,
    });
    expect(hook.result.current.status).toBe("saved");

    const changed = { fields: { Provider: "Acme, Inc." }, transcript: [] };
    hook.rerender({
      initialId: null,
      documentKey: "csa",
      title: "CSA",
      data: changed,
      enabled: true,
    });
    await vi.advanceTimersByTimeAsync(1600);
    expect(updateMock).toHaveBeenCalledWith(7, {
      title: "CSA",
      data: changed,
    });
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("does nothing while disabled or without a document", async () => {
    const hook = renderAutoSave({ enabled: false });
    await vi.advanceTimersByTimeAsync(3000);
    expect(createMock).not.toHaveBeenCalled();

    hook.rerender({
      initialId: null,
      documentKey: null,
      title: "",
      data: DATA,
      enabled: true,
    });
    await vi.advanceTimersByTimeAsync(3000);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("skips a restored document whose content hasn't changed", async () => {
    const hook = renderAutoSave({ initialId: 5 });
    expect(hook.result.current.status).toBe("saved");
    await vi.advanceTimersByTimeAsync(3000);
    expect(updateMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("chains one follow-up save when a change lands mid-flight", async () => {
    let resolveCreate!: (v: { id: number }) => void;
    createMock.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    updateMock.mockResolvedValue({ id: 9 });
    const hook = renderAutoSave();

    await vi.advanceTimersByTimeAsync(1600); // create starts, stays pending
    const changed = { fields: { Provider: "Changed" }, transcript: [] };
    hook.rerender({
      initialId: null,
      documentKey: "csa",
      title: "CSA",
      data: changed,
      enabled: true,
    });
    await vi.advanceTimersByTimeAsync(1600); // timer fires while in flight
    resolveCreate({ id: 9 });
    await vi.advanceTimersByTimeAsync(0); // flush the chained follow-up save
    expect(updateMock).toHaveBeenCalledWith(9, {
      title: "CSA",
      data: changed,
    });
  });
});
