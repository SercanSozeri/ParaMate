export const logger = {
  info: (message: string, ...optional: unknown[]) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...optional);
  },
  error: (message: string, ...optional: unknown[]) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...optional);
  }
};

