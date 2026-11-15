import { describe, expect, it } from "vitest";
import { DialogController } from "./DialogController";

describe("DialogController", () => {
  it("resolves with the confirmed answer and closes", async () => {
    const dialogs = new DialogController();
    const answer = dialogs.ask({ kind: "password", fileName: "a.pdf", isRetry: false });
    expect(dialogs.getSnapshot()).toMatchObject({ kind: "password", fileName: "a.pdf" });

    dialogs.confirm<"password">("secret");
    await expect(answer).resolves.toBe("secret");
    expect(dialogs.getSnapshot()).toBeNull();
  });

  it("resolves with null when cancelled", async () => {
    const dialogs = new DialogController();
    const answer = dialogs.ask({ kind: "saveProtection", originalPassword: "x" });
    dialogs.cancel();
    await expect(answer).resolves.toBeNull();
  });

  it("cancels an open dialog when another one is requested", async () => {
    const dialogs = new DialogController();
    const first = dialogs.ask({ kind: "password", fileName: "a.pdf", isRetry: false });
    void dialogs.ask({ kind: "password", fileName: "b.pdf", isRetry: false });
    await expect(first).resolves.toBeNull();
    expect(dialogs.getSnapshot()).toMatchObject({ fileName: "b.pdf" });
  });
});
