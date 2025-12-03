import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

function createThemeStore() {
    const initialTheme: Theme = browser && localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
    const { subscribe, set, update } = writable<Theme>(initialTheme);

    return {
        subscribe,
        toggle: () => update(theme => {
            const newTheme = theme === 'light' ? 'dark' : 'light';
            if (browser) {
                localStorage.setItem('theme', newTheme);
                if (newTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }
            return newTheme;
        }),
        init: () => {
            if (browser) {
                const theme = localStorage.getItem('theme') as Theme;
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    set('dark');
                    document.documentElement.classList.add('dark');
                } else {
                    set('light');
                    document.documentElement.classList.remove('dark');
                }
            }
        }
    };
}

export const theme = createThemeStore();
