export interface IDateUtils {
  isWithinDays(date: Date, days: number): boolean;
}

export class DateUtils implements IDateUtils {
  isWithinDays(date: Date, days: number): boolean {
    const now = Date.now();
    const targetTime = date.getTime();
    const diffInMs = now - targetTime;
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    return diffInDays <= days;
  }
}
