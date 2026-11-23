export function log(level: 'info' | 'warn' | 'error', event: string, details: Record<string, unknown> = {}): void {
    console[level](JSON.stringify({ time: new Date().toISOString(), level, event, ...details }));
}

export function errorDetails(error: unknown): Record<string, unknown> {
    if (!(error instanceof Error)) return { message: 'Unknown error' };
    return { name: error.name, message: error.message, code: (error as Error & { code?: string }).code };
}
