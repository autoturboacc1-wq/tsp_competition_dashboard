import { supabase } from '$lib/supabase';
import { getCached, setCache } from '$lib/cache';
import type { PageServerLoad } from './$types';

const CACHE_KEY = 'admin';
const CACHE_TTL = 60_000;

export const load: PageServerLoad = async () => {
    const cached = getCached<any>(CACHE_KEY);
    if (cached) return cached;

    try {
        // First get the latest date
        const { data: latestDateRow } = await supabase
            .from('daily_stats')
            .select('date')
            .order('date', { ascending: false })
            .limit(1);

        const latestDate = latestDateRow?.[0]?.date;

        const [participantsResult, statsResult, snapshotResult, dateCountResult] = await Promise.all([
            supabase
                .from('participants')
                .select('id, nickname, account_id, server, created_at')
                .order('created_at', { ascending: true }),

            // Only fetch stats for the latest date
            latestDate
                ? supabase
                    .from('daily_stats')
                    .select('participant_id, date, balance, equity, profit, points, total_trades, win_rate')
                    .eq('date', latestDate)
                : Promise.resolve({ data: [] }),

            supabase
                .from('equity_snapshots')
                .select('participant_id, timestamp')
                .order('timestamp', { ascending: false })
                .limit(1),

            // Count unique dates separately
            supabase
                .from('daily_stats')
                .select('date')
                .order('date', { ascending: false })
        ]);

        const participants = participantsResult.data || [];
        const allStats = (statsResult as any).data || [];
        const lastSnapshot = snapshotResult.data?.[0];

        // Already filtered by date, so each row is unique per participant
        const latestStatsMap = new Map<string, any>();
        allStats.forEach((s: any) => {
            latestStatsMap.set(s.participant_id, s);
        });

        // Count unique dates
        const uniqueDates = new Set((dateCountResult.data || []).map((s: any) => s.date));

        const enrichedParticipants = participants.map(p => ({
            ...p,
            latestStats: latestStatsMap.get(p.id) || null
        }));

        const result = {
            participants: enrichedParticipants,
            syncInfo: {
                lastSyncDate: latestDate || null,
                lastSnapshotTime: lastSnapshot?.timestamp || null,
                totalSyncDays: uniqueDates.size,
                totalParticipants: participants.length
            }
        };

        setCache(CACHE_KEY, result, CACHE_TTL);
        return result;
    } catch (e) {
        console.error('Admin data fetch failed:', e);
        return {
            participants: [],
            syncInfo: {
                lastSyncDate: null,
                lastSnapshotTime: null,
                totalSyncDays: 0,
                totalParticipants: 0
            }
        };
    }
};
