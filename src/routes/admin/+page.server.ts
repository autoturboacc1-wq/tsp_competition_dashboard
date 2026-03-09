import { supabase } from '$lib/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    try {
        const [participantsResult, statsResult, snapshotResult] = await Promise.all([
            supabase
                .from('participants')
                .select('id, nickname, account_id, server, created_at')
                .order('created_at', { ascending: true }),

            supabase
                .from('daily_stats')
                .select('participant_id, date, balance, equity, profit, points, total_trades, win_rate')
                .order('date', { ascending: false }),

            supabase
                .from('equity_snapshots')
                .select('participant_id, timestamp')
                .order('timestamp', { ascending: false })
                .limit(1)
        ]);

        const participants = participantsResult.data || [];
        const allStats = statsResult.data || [];
        const lastSnapshot = snapshotResult.data?.[0];

        // Get latest stats per participant
        const latestStatsMap = new Map<string, any>();
        allStats.forEach(s => {
            if (!latestStatsMap.has(s.participant_id)) {
                latestStatsMap.set(s.participant_id, s);
            }
        });

        // Count total trades and stats dates
        const uniqueDates = new Set(allStats.map(s => s.date));

        const enrichedParticipants = participants.map(p => ({
            ...p,
            latestStats: latestStatsMap.get(p.id) || null
        }));

        return {
            participants: enrichedParticipants,
            syncInfo: {
                lastSyncDate: allStats[0]?.date || null,
                lastSnapshotTime: lastSnapshot?.timestamp || null,
                totalSyncDays: uniqueDates.size,
                totalParticipants: participants.length
            }
        };
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
