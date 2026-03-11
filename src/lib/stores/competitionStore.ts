import { writable } from 'svelte/store';

export interface Competition {
    id: string;
    name: string;
    slug: string;
    start_date: string;
    end_date: string;
    status: 'upcoming' | 'active' | 'completed';
}

export const activeCompetition = writable<Competition | null>(null);
export const competitions = writable<Competition[]>([]);
