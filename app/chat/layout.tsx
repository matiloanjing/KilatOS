/**
 * Chat Layout
 * 
 * Overrides the global layout to remove the marketing Navbar.
 * Chat page has its own HeaderBar for IDE-like experience.
 * 
 * Copyright © 2026 KilatCode Studio
 */

export default function ChatLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Render children directly without the global Navbar
    // The chat page already has its own HeaderBar
    return <>{children}</>;
}
