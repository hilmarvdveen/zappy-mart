export function toContractDateTime(moment: Date): string {
  return `${moment.toISOString().slice(0, 19)}Z`;
}

export function toStoredDateTime(moment: Date): string {
  return moment.toISOString();
}

export function fromContractDateTime(value: string): Date {
  const moment = new Date(value);
  if (Number.isNaN(moment.getTime())) {
    throw new Error(`A moment in time is an ISO 8601 string in UTC, received ${value}`);
  }
  return moment;
}

export type Clock = {
  now(): Date;
};

export const systemClock: Clock = {
  now(): Date {
    return new Date();
  }
};

export function fixedClock(moment: Date): Clock {
  return {
    now(): Date {
      return moment;
    }
  };
}
