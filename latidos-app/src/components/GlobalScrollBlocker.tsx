"use client";

import { useEffect } from "react";

export function GlobalScrollBlocker() {
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (e.target instanceof HTMLInputElement && e.target.type === 'number') {
                e.preventDefault();
            }
        };

        // Needs to be passive: false to allow preventDefault
        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleWheel);
    }, []);

    return null;
}
