export interface PasswordDialogRequest {
  readonly kind: "password";
  readonly fileName: string;
  readonly isRetry: boolean;
}

export interface SaveProtectionDialogRequest {
  readonly kind: "saveProtection";
  /** The password the original file was opened with, offered as the default. */
  readonly originalPassword: string;
}

export interface PageRangeDialogRequest {
  readonly kind: "pageRange";
  readonly pageCount: number;
}

export type DialogRequest = PasswordDialogRequest | SaveProtectionDialogRequest | PageRangeDialogRequest;

export interface SaveProtectionChoice {
  /** Password for the saved file, or null to save it unprotected. */
  readonly password: string | null;
}

/** What each kind of dialog resolves with when the user confirms it. */
export interface DialogAnswers {
  readonly pageRange: import("../../core/document/pageRange").PageRange;
  readonly password: string;
  readonly saveProtection: SaveProtectionChoice;
}

type DialogKind = DialogRequest["kind"];

interface OpenDialog {
  readonly request: DialogRequest;
  readonly resolve: (answer: unknown) => void;
}

/**
 * Lets editor actions ask the user a question and await the answer, without knowing
 * how the question is shown. One dialog is open at a time.
 */
export class DialogController {
  private open: OpenDialog | null = null;
  private readonly listeners = new Set<() => void>();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): DialogRequest | null => this.open?.request ?? null;

  /** Shows a dialog. Resolves with the answer, or null if the user cancels. */
  ask<K extends DialogKind>(request: Extract<DialogRequest, { kind: K }>): Promise<DialogAnswers[K] | null> {
    this.cancel();
    return new Promise((resolve) => {
      this.open = { request, resolve: resolve as (answer: unknown) => void };
      this.notify();
    });
  }

  confirm<K extends DialogKind>(answer: DialogAnswers[K]): void {
    this.close(answer);
  }

  cancel(): void {
    this.close(null);
  }

  private close(answer: unknown): void {
    const closing = this.open;
    if (!closing) {
      return;
    }
    this.open = null;
    closing.resolve(answer);
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}
