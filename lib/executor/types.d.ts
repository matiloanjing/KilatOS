/**
 * Type declarations for optional dependencies
 * These are dynamically imported and may not be installed
 */

// WebContainer API (optional - only in browser)
declare module '@webcontainer/api' {
    export interface WebContainer {
        mount(files: Record<string, any>): Promise<void>;
        spawn(command: string, args: string[]): Promise<{
            output: ReadableStream;
            exit: Promise<number>;
        }>;
    }

    export const WebContainer: {
        boot(): Promise<WebContainer>;
    };
}
