import type { Database } from "../persistence/database.js";

export type HandledEventStore = {
  onlyOnce(eventId: string, consumer: string, work: () => Promise<void>): Promise<boolean>;
  hasHandled(eventId: string, consumer: string): Promise<boolean>;
  forgetEverything(): Promise<void>;
};

export async function createHandledEventTable(database: Database): Promise<void> {
  await database.execute(`
    create table if not exists handled_event (
      event_id text not null,
      consumer text not null,
      handled_at text not null,
      primary key (event_id, consumer)
    )
  `);
}

export function sqlHandledEventStore(database: Database, now: () => Date): HandledEventStore {
  async function hasHandled(eventId: string, consumer: string): Promise<boolean> {
    const row = await database.queryOne<{ event_id: string }>(
      "select event_id from handled_event where event_id = ? and consumer = ?",
      [eventId, consumer]
    );
    return row !== null;
  }

  return {
    hasHandled,

    async onlyOnce(eventId: string, consumer: string, work: () => Promise<void>): Promise<boolean> {
      if (await hasHandled(eventId, consumer)) {
        return false;
      }
      await work();
      await database.execute(
        "insert into handled_event (event_id, consumer, handled_at) values (?, ?, ?)",
        [eventId, consumer, now().toISOString()]
      );
      return true;
    },

    async forgetEverything(): Promise<void> {
      await database.execute("delete from handled_event", []);
    }
  };
}
