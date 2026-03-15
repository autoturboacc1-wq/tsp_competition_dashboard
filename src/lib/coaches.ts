export interface Coach {
	name: string;
	time: string;
	startHour: number;
	endHour: number;
	channel: string;
	color: string;
	colorBorder: string;
	colorText: string;
	colorBg: string;
	youtube: string;
	avatar: string;
	glow: string;
}

export const coaches: Coach[] = [
	{
		name: 'COACH PING',
		time: '05:00-07:00',
		startHour: 5,
		endHour: 7,
		channel: 'Gold with Ping',
		color: 'from-pink-500 to-rose-400',
		colorBorder: 'border-pink-500/30',
		colorText: 'text-pink-400',
		colorBg: 'bg-pink-500/10',
		youtube: '@goldwithping',
		avatar: '/coaches/ping.png',
		glow: '236,72,153'
	},
	{
		name: 'COACH BALL',
		time: '07:00-10:00',
		startHour: 7,
		endHour: 10,
		channel: 'Trader10X',
		color: 'from-orange-500 to-amber-400',
		colorBorder: 'border-orange-500/30',
		colorText: 'text-orange-400',
		colorBg: 'bg-orange-500/10',
		youtube: '@trader10-x',
		avatar: '/coaches/ball.png',
		glow: '249,115,22'
	},
	{
		name: 'COACH PU',
		time: '10:00-12:00',
		startHour: 10,
		endHour: 12,
		channel: 'Pu MoneyMind',
		color: 'from-yellow-500 to-amber-300',
		colorBorder: 'border-yellow-500/30',
		colorText: 'text-yellow-400',
		colorBg: 'bg-yellow-500/10',
		youtube: '@PuMoneyMind',
		avatar: '/coaches/pu.png',
		glow: '234,179,8'
	},
	{
		name: 'COACH CZECH',
		time: '12:00-14:00',
		startHour: 12,
		endHour: 14,
		channel: 'ALL Time High',
		color: 'from-green-500 to-emerald-400',
		colorBorder: 'border-green-500/30',
		colorText: 'text-green-400',
		colorBg: 'bg-green-500/10',
		youtube: '@alltimehigh.official',
		avatar: '/coaches/czech.png',
		glow: '34,197,94'
	},
	{
		name: 'COACH FUTURE',
		time: '14:00-16:00',
		startHour: 14,
		endHour: 16,
		channel: 'Trade the Future',
		color: 'from-teal-500 to-cyan-400',
		colorBorder: 'border-teal-500/30',
		colorText: 'text-teal-400',
		colorBg: 'bg-teal-500/10',
		youtube: '@tradethefuturebyfuture',
		avatar: '/coaches/future.png',
		glow: '20,184,166'
	},
	{
		name: 'COACH JHEE',
		time: '16:00-19:00',
		startHour: 16,
		endHour: 19,
		channel: 'Jhee Aroonwan',
		color: 'from-blue-500 to-indigo-400',
		colorBorder: 'border-blue-500/30',
		colorText: 'text-blue-400',
		colorBg: 'bg-blue-500/10',
		youtube: '@jheearoonwan',
		avatar: '/coaches/jhee.png',
		glow: '59,130,246'
	},
	{
		name: 'COACH ICZ',
		time: '19:00-21:00',
		startHour: 19,
		endHour: 21,
		channel: 'เทรดทองกับท่านสุลต่าล',
		color: 'from-purple-500 to-violet-400',
		colorBorder: 'border-purple-500/30',
		colorText: 'text-purple-400',
		colorBg: 'bg-purple-500/10',
		youtube: '@portgoldtrader',
		avatar: '/coaches/icz.png',
		glow: '168,85,247'
	},
	{
		name: 'COACH DUK',
		time: '21:00-23:00',
		startHour: 21,
		endHour: 23,
		channel: 'PIDFAH',
		color: 'from-pink-500 to-fuchsia-400',
		colorBorder: 'border-pink-500/30',
		colorText: 'text-pink-400',
		colorBg: 'bg-pink-500/10',
		youtube: '@Pidfah',
		avatar: '/coaches/duk.png',
		glow: '217,70,239'
	},
	{
		name: 'COACH MAY',
		time: '23:00-02:00',
		startHour: 23,
		endHour: 26,
		channel: 'Mayday Channel',
		color: 'from-red-500 to-rose-400',
		colorBorder: 'border-red-500/30',
		colorText: 'text-red-400',
		colorBg: 'bg-red-500/10',
		youtube: '@MC.Maydaychannel',
		avatar: '/coaches/may.png',
		glow: '239,68,68'
	}
];
