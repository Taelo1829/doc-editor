interface Entry<T> {
  readonly state: T;
  readonly label: string;
}

/** Linear undo/redo over immutable states. */
export class History<T> {
  private past: Entry<T>[] = [];
  private future: Entry<T>[] = [];
  private presentState: T;
  private presentLabel = "";

  constructor(
    initial: T,
    private readonly limit = 200,
  ) {
    this.presentState = initial;
  }

  get present(): T {
    return this.presentState;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /** Label of the edit that undo would reverse. */
  get undoLabel(): string | null {
    return this.canUndo ? this.presentLabel : null;
  }

  get redoLabel(): string | null {
    return this.future.at(-1)?.label ?? null;
  }

  commit(next: T, label: string): void {
    if (next === this.presentState) {
      return;
    }
    this.past.push({ state: this.presentState, label: this.presentLabel });
    this.past = this.past.slice(-this.limit);
    this.future = [];
    this.presentState = next;
    this.presentLabel = label;
  }

  undo(): void {
    const previous = this.past.pop();
    if (!previous) {
      return;
    }
    this.future.push({ state: this.presentState, label: this.presentLabel });
    this.presentState = previous.state;
    this.presentLabel = previous.label;
  }

  redo(): void {
    const next = this.future.pop();
    if (!next) {
      return;
    }
    this.past.push({ state: this.presentState, label: this.presentLabel });
    this.presentState = next.state;
    this.presentLabel = next.label;
  }

  reset(state: T): void {
    this.past = [];
    this.future = [];
    this.presentState = state;
    this.presentLabel = "";
  }
}
