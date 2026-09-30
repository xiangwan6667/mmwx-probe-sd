export const hasMeasurement = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export const allMeasurements = (values: readonly unknown[]): boolean => values.length > 0 && values.every(hasMeasurement);
export const hasText = (value: unknown): boolean => typeof value === 'string' && value.trim().length > 0;
