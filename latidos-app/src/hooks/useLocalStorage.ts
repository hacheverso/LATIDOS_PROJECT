import { useState, useEffect } from "react";

/**
 * Hook to manage a value in localStorage.
 * Returns the current value (or initialValue if not found/SSR), a setter, and a remover.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
    // State to store our value
    // Pass initial state function to useState so logic is only executed once
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === "undefined") {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    // Return a wrapped version of useState's setter function that ...
    // ... persists the new value to localStorage.
    const setValue = (value: T | ((val: T) => T)) => {
        try {
            // Allow value to be a function so we have same API as useState
            const valueToStore =
                value instanceof Function ? value(storedValue) : value;

            // Save state
            setStoredValue(valueToStore);

            // Save to local storage
            if (typeof window !== "undefined") {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
        }
    };

    const removeValue = () => {
        try {
            if (typeof window !== "undefined") {
                window.localStorage.removeItem(key);
                // We might want to reset the state to initialValue, or keep it as is?
                // Usually remove implies clearing.
                setStoredValue(initialValue);
            }
        } catch (error) {
            console.warn(`Error removing localStorage key "${key}":`, error);
        }
    };

    return [storedValue, setValue, removeValue] as const;
}
