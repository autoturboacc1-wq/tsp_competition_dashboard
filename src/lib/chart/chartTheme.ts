export function getChartColors(isDark: boolean) {
	return {
		background: 'transparent',
		textColor: isDark ? '#9CA3AF' : '#6B7280',
		gridColor: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(209, 213, 219, 0.5)',
		crosshairLabelBg: isDark ? '#1F2937' : '#F3F4F6',
		crosshairLabelText: isDark ? '#D1D5DB' : '#374151',
	};
}
