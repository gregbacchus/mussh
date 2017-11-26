const queues: WorkQueue[] = [];

export type Done = (err?: Error) => void;
export type Task = (done: Done) => void;

class QueuedTask {
  public task: Task;
  public done?: Done;
}

export class WorkQueue {
  public static get(name) {
    let queue = queues[name];
    if (!queue) queue = queues[name] = new WorkQueue();
    return queue;
  }

  private running: QueuedTask | undefined;
  private pending: QueuedTask[];

  constructor() {
    this.running = undefined;
    this.pending = [];
  }

  public add(task: Task, done?: Done) {
    this.pending.push({task, done});
    if (!this.running) {
      this.next();
    }
  }

  private run(task: Task, done?: Done) {
    const next = (err: Error) => {
      done && done(err);
      this.next();
    };
    try {
      task(next);
    } catch (err) {
      done && done(err);
    }
  }

  private next() {
    const next = this.running = this.pending.shift();
    if (next) {
      this.run(next.task, next.done);
    }
  }
}
