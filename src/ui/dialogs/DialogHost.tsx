import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import type {
  DialogRequest,
  PasswordDialogRequest,
  PageRangeDialogRequest,
  SaveProtectionDialogRequest,
} from "../../editor/dialogs/DialogController";
import { useEditorServices, useEditorState } from "../EditorContext";
import { pageRangeError } from "../../core/document/pageRange";
import { RangePagePreview } from "./RangePagePreview";

type DialogComponents = {
  [K in DialogRequest["kind"]]: (props: { request: Extract<DialogRequest, { kind: K }> }) => ReactNode;
};

const dialogComponents: DialogComponents = {
  password: PasswordDialog,
  saveProtection: SaveProtectionDialog,
  pageRange: PageRangeDialog,
};

/** Shows whichever dialog an editor action is currently waiting on. */
export function DialogHost() {
  const { dialogs } = useEditorServices();
  const request = useSyncExternalStore(dialogs.subscribe, dialogs.getSnapshot);
  if (!request) {
    return null;
  }
  const Dialog = dialogComponents[request.kind] as (props: { request: DialogRequest }) => ReactNode;
  // A fresh key per request resets the form, e.g. after a wrong password.
  return <Dialog key={JSON.stringify(request)} request={request} />;
}

// ── Shared pieces ──────────────────────────────────────────────────────────────

interface ModalProps {
  readonly title: string;
  readonly submitLabel: string;
  readonly canSubmit: boolean;
  readonly children: ReactNode;
  onSubmit(): void;
}

function Modal({ title, submitLabel, canSubmit, children, onSubmit }: ModalProps) {
  const { dialogs } = useEditorServices();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (canSubmit) {
      onSubmit();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        dialogs.cancel();
      }}
    >
      <form onSubmit={handleSubmit}>
        <h2 id="modal-title">{title}</h2>
        {children}
        <div className="modal-actions">
          <button type="button" className="button" onClick={() => dialogs.cancel()}>
            Cancel
          </button>
          <button type="submit" className="button button-primary" disabled={!canSubmit}>
            {submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}

interface PasswordInputProps {
  readonly value: string;
  readonly label: string;
  readonly autoFocus?: boolean;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  onChange(value: string): void;
}

function PasswordInput({ value, label, autoFocus, disabled, invalid, onChange }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <div className="password-input" data-invalid={invalid || undefined}>
      <input
        type={isVisible ? "text" : "password"}
        value={value}
        aria-label={label}
        aria-invalid={invalid}
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="password-toggle"
        disabled={disabled}
        onClick={() => setIsVisible((visible) => !visible)}
        aria-pressed={isVisible}
      >
        {isVisible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

// ── Dialogs ────────────────────────────────────────────────────────────────────

function PageRangeDialog({ request }: { request: PageRangeDialogRequest }) {
  const { dialogs } = useEditorServices();
  const { document } = useEditorState();
  const [start, setStart] = useState("1");
  const [end, setEnd] = useState(String(request.pageCount));
  const range = { start: start === "" ? NaN : Number(start), end: end === "" ? NaN : Number(end) };
  const error = pageRangeError(range, request.pageCount);
  return (
    <Modal title="Split by range" submitLabel="Save range as PDF" canSubmit={!error}
      onSubmit={() => dialogs.confirm<"pageRange">(range)}>
      <p className="modal-text">
        Save a range from this {request.pageCount}-page document as a separate PDF.
        Page numbers follow the current order; both endpoints are included.
      </p>
      <div className="page-range-fields">
        <label>Start page
          <input type="number" min={1} max={request.pageCount} step={1} value={start} autoFocus
            aria-describedby="page-range-feedback" aria-invalid={!!error}
            onChange={(event) => setStart(event.target.value)} />
        </label>
        <label>End page
          <input type="number" min={1} max={request.pageCount} step={1} value={end}
            aria-describedby="page-range-feedback" aria-invalid={!!error}
            onChange={(event) => setEnd(event.target.value)} />
        </label>
      </div>
      <p id="page-range-feedback" className={error ? "modal-error" : "modal-text"} aria-live="polite">
        {error ?? `${range.end - range.start + 1} page(s) will be saved. The open document stays intact.`}
      </p>
      <div className="range-page-previews">
        <RangePagePreview document={document} pageNumber={range.start} label="First page" />
        <RangePagePreview document={document} pageNumber={range.end} label="Last page" />
      </div>
    </Modal>
  );
}

function PasswordDialog({ request }: { request: PasswordDialogRequest }) {
  const { dialogs } = useEditorServices();
  const [password, setPassword] = useState("");
  return (
    <Modal
      title="Password required"
      submitLabel="Open"
      canSubmit={password.length > 0}
      onSubmit={() => dialogs.confirm<"password">(password)}
    >
      <p className="modal-text">
        <strong>{request.fileName}</strong> is password protected. Enter its password to open it.
      </p>
      <PasswordInput value={password} label="Password" autoFocus invalid={request.isRetry} onChange={setPassword} />
      {request.isRetry && (
        <p className="modal-error" role="alert">
          That password didn't work. Try again.
        </p>
      )}
    </Modal>
  );
}

function SaveProtectionDialog({ request }: { request: SaveProtectionDialogRequest }) {
  const { dialogs } = useEditorServices();
  const [keepProtection, setKeepProtection] = useState(true);
  const [password, setPassword] = useState(request.originalPassword);
  return (
    <Modal
      title="Keep password protection?"
      submitLabel="Save"
      canSubmit={!keepProtection || password.length > 0}
      onSubmit={() =>
        dialogs.confirm<"saveProtection">({ password: keepProtection ? password : null })
      }
    >
      <p className="modal-text">
        This document includes pages from a password-protected PDF. Choose how to protect the copy you save.
      </p>
      <div className="choice-list" role="radiogroup">
        <label className="choice">
          <input type="radio" name="protection" checked={keepProtection} onChange={() => setKeepProtection(true)} />
          <span>
            <span className="choice-title">Protect with a password</span>
            <span className="choice-hint">Uses the original password unless you change it.</span>
          </span>
        </label>
        <div className="choice-detail">
          <PasswordInput
            value={password}
            label="Password for the saved file"
            disabled={!keepProtection}
            onChange={setPassword}
          />
        </div>
        <label className="choice">
          <input type="radio" name="protection" checked={!keepProtection} onChange={() => setKeepProtection(false)} />
          <span>
            <span className="choice-title">Save without a password</span>
            <span className="choice-hint">Anyone with the file can open it.</span>
          </span>
        </label>
      </div>
    </Modal>
  );
}
