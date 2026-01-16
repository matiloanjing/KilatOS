/**
 * NavbarWrapper - Conditionally renders Navbar
 * 
 * Hides Navbar on /chat route where HeaderBar is used instead.
 * 
 * Copyright © 2026 KilatCode Studio
 */

'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

// Routes that should NOT show the marketing Navbar
const NAVBAR_HIDDEN_ROUTES = ['/chat', '/webcontainer-test'];

export default function NavbarWrapper() {
    const pathname = usePathname();

    // Check if current route should hide navbar
    const shouldHideNavbar = NAVBAR_HIDDEN_ROUTES.some(route =>
        pathname?.startsWith(route)
    );

    if (shouldHideNavbar) {
        return null;
    }

    return <Navbar />;
}
