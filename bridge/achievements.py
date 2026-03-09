from core import get_supabase_client

supabase = get_supabase_client()

# Badge definitions: (badge_type, badge_label, description, check_function)
BADGE_EMOJI = {
    'first_trade': '🎯',
    'streak_5': '🔥',
    'streak_10': '💥',
    'trades_50': '⚔️',
    'trades_100': '🤖',
    'profit_1000': '💰',
    'win_rate_70': '🎯',
    'low_dd_5': '🛡️',
    'best_day': '🏆',
}


def _upsert_badge(participant_id: str, badge_type: str, badge_label: str, description: str):
    """Insert a badge if it doesn't already exist (unique constraint handles duplicates)."""
    try:
        supabase.table('achievements').upsert({
            'participant_id': participant_id,
            'badge_type': badge_type,
            'badge_label': badge_label,
            'description': description,
        }, on_conflict='participant_id,badge_type').execute()
    except Exception as e:
        print(f"[Achievements] Error upserting badge '{badge_type}': {e}")


def check_achievements(participant_id: str, stats_data: dict):
    """Check and award badges based on the latest stats_data dict from sync_participant."""
    try:
        total_trades = stats_data.get('total_trades', 0)
        profit = stats_data.get('profit', 0)
        win_rate = stats_data.get('win_rate', 0)
        max_drawdown = stats_data.get('max_drawdown', 0)
        max_consecutive_wins = stats_data.get('max_consecutive_wins', 0)

        # first_trade - Completed first trade
        if total_trades >= 1:
            _upsert_badge(participant_id, 'first_trade', 'First Blood',
                          'Completed your first trade')

        # streak_5 - 5 consecutive wins
        if max_consecutive_wins >= 5:
            _upsert_badge(participant_id, 'streak_5', 'Hot Streak',
                          '5 consecutive winning trades')

        # streak_10 - 10 consecutive wins
        if max_consecutive_wins >= 10:
            _upsert_badge(participant_id, 'streak_10', 'Unstoppable',
                          '10 consecutive winning trades')

        # trades_50 - 50+ total trades
        if total_trades >= 50:
            _upsert_badge(participant_id, 'trades_50', 'Veteran Trader',
                          'Completed 50+ trades')

        # trades_100 - 100+ total trades
        if total_trades >= 100:
            _upsert_badge(participant_id, 'trades_100', 'Trading Machine',
                          'Completed 100+ trades')

        # profit_1000 - $1000+ total profit
        if profit >= 1000:
            _upsert_badge(participant_id, 'profit_1000', 'Grand Profit',
                          'Earned $1,000+ in total profit')

        # win_rate_70 - 70%+ win rate with 20+ trades
        if win_rate >= 70 and total_trades >= 20:
            _upsert_badge(participant_id, 'win_rate_70', 'Sharpshooter',
                          '70%+ win rate with 20+ trades')

        # low_dd_5 - Max drawdown under 5% with 20+ trades
        if 0 <= max_drawdown < 5 and total_trades >= 20:
            _upsert_badge(participant_id, 'low_dd_5', 'Risk Master',
                          'Max drawdown under 5% with 20+ trades')

        # best_day - Best single-day profit in competition
        _check_best_day(participant_id, stats_data)

        print(f"[Achievements] Checked badges for participant {participant_id}")

    except Exception as e:
        print(f"[Achievements] Error checking achievements: {e}")


def _check_best_day(participant_id: str, stats_data: dict):
    """Award 'best_day' badge to the participant with the highest single-day profit."""
    try:
        best_trade = stats_data.get('best_trade', 0)
        if best_trade <= 0:
            return

        # Get today's date
        today = stats_data.get('date')
        if not today:
            return

        # Find the best single-day profit across ALL participants for today
        result = supabase.table('daily_stats') \
            .select('participant_id, profit') \
            .eq('date', today) \
            .order('profit', desc=True) \
            .limit(1) \
            .execute()

        if result.data and len(result.data) > 0:
            top = result.data[0]
            if top['participant_id'] == participant_id and top['profit'] > 0:
                _upsert_badge(participant_id, 'best_day', 'Day Champion',
                              'Best single-day profit in the competition')

    except Exception as e:
        print(f"[Achievements] Error checking best_day: {e}")
