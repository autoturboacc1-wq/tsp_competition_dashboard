<script lang="ts">
	import { onMount } from "svelte";

	type Language = "th" | "en";

	const translations = {
		en: {
			metaTitle: "Rules & Scoring | EliteGold",
			title: "Competition",
			titleHighlight: "Rules",
			description:
				"How the EliteGold Competition works and how scores are calculated.",
			languageLabel: "Language",
			sections: {
				points: {
					title: "Points System",
					description: "Points are calculated based on multiple performance factors:",
					items: [
						{
							title: "Net Profit",
							description: "Total realized P/L from closed trades"
						},
						{
							title: "Win Rate",
							description: "Percentage of profitable trades"
						},
						{
							title: "Profit Factor",
							description: "Ratio of gross profit to gross loss"
						},
						{
							title: "Risk Management",
							description: "Max drawdown penalty applied"
						}
					]
				},
				rules: {
					title: "General Rules",
					items: [
						"All participants must trade on their registered MT5 account only.",
						"Trading instruments allowed: Gold (XAUUSD) only.",
						"No use of arbitrage, HFT bots, or exploit-based strategies.",
						"Each participant starts with the same initial balance.",
						"Data is synced automatically from MT5 every 60 seconds.",
						"Rankings are updated in real-time based on points calculation.",
						"Rank changes are shown daily (compared to previous day's ranking)."
					]
				},
				sessions: {
					title: "Trading Sessions",
					description: "Performance is tracked across three major sessions (UTC):",
					items: [
						{ title: "Asian", description: "00:00 - 08:00 UTC" },
						{ title: "London", description: "08:00 - 16:00 UTC" },
						{ title: "New York", description: "13:00 - 21:00 UTC" }
					]
				},
				disqualification: {
					title: "Disqualification",
					items: [
						"Using multiple accounts or trading on behalf of another participant.",
						"Exploiting platform bugs or using prohibited strategies.",
						"Any form of manipulation that provides an unfair advantage.",
						"Decisions by the organizers are final."
					]
				}
			},
			cta: "View Leaderboard"
		},
		th: {
			metaTitle: "กติกาและการให้คะแนน | EliteGold",
			title: "กติกา",
			titleHighlight: "การแข่งขัน",
			description: "รายละเอียดการแข่ง EliteGold และวิธีคำนวณคะแนนของผู้เข้าแข่งขัน",
			languageLabel: "ภาษา",
			sections: {
				points: {
					title: "ระบบคะแนน",
					description: "คะแนนจะคำนวณจากหลายปัจจัยด้านผลการเทรด:",
					items: [
						{
							title: "กำไรสุทธิ",
							description: "ผลรวมกำไร/ขาดทุนที่ปิดออเดอร์แล้วทั้งหมด"
						},
						{
							title: "อัตราชนะ",
							description: "เปอร์เซ็นต์ของออเดอร์ที่มีกำไร"
						},
						{
							title: "Profit Factor",
							description: "อัตราส่วนกำไรรวมเทียบกับขาดทุนรวม"
						},
						{
							title: "การบริหารความเสี่ยง",
							description: "มีการหักคะแนนจากค่า drawdown สูงสุด"
						}
					]
				},
				rules: {
					title: "กติกาทั่วไป",
					items: [
						"ผู้เข้าแข่งขันทุกคนต้องเทรดผ่านบัญชี MT5 ที่ลงทะเบียนไว้เท่านั้น",
						"สินทรัพย์ที่อนุญาต: Gold (XAUUSD) เท่านั้น",
						"ห้ามใช้กลยุทธ์แบบ arbitrage, HFT bots หรือการเอาช่องโหว่ของระบบ",
						"ผู้เข้าแข่งขันทุกคนเริ่มต้นด้วยยอดเงินตั้งต้นเท่ากัน",
						"ระบบจะซิงก์ข้อมูลจาก MT5 อัตโนมัติทุก 60 วินาที",
						"อันดับจะอัปเดตแบบเรียลไทม์ตามสูตรคำนวณคะแนน",
						"การเปลี่ยนอันดับจะแสดงรายวันโดยเทียบกับอันดับของวันก่อนหน้า"
					]
				},
				sessions: {
					title: "ช่วงเวลาเทรด",
					description: "ผลการเทรดจะถูกติดตามใน 3 ช่วงเวลาหลัก (UTC):",
					items: [
						{ title: "เอเชีย", description: "00:00 - 08:00 UTC" },
						{ title: "ลอนดอน", description: "08:00 - 16:00 UTC" },
						{ title: "นิวยอร์ก", description: "13:00 - 21:00 UTC" }
					]
				},
				disqualification: {
					title: "การตัดสิทธิ์",
					items: [
						"ใช้หลายบัญชี หรือเทรดแทนผู้เข้าแข่งขันคนอื่น",
						"ใช้ช่องโหว่ของแพลตฟอร์ม หรือใช้กลยุทธ์ที่ถูกห้าม",
						"กระทำการใด ๆ ที่เป็นการบิดเบือนการแข่งขันเพื่อให้ได้เปรียบอย่างไม่เป็นธรรม",
						"คำตัดสินของผู้จัดการแข่งขันถือเป็นที่สิ้นสุด"
					]
				}
			},
			cta: "ดูตารางคะแนน"
		}
	} as const;

	let language: Language = "en";

	$: content = translations[language];

	function setLanguage(nextLanguage: Language) {
		language = nextLanguage;
		if (typeof localStorage !== "undefined") {
			localStorage.setItem("rules-language", nextLanguage);
		}
	}

	onMount(() => {
		const savedLanguage = localStorage.getItem("rules-language");
		if (savedLanguage === "th" || savedLanguage === "en") {
			language = savedLanguage;
			return;
		}

		if (navigator.language.toLowerCase().startsWith("th")) {
			language = "th";
		}
	});
</script>

<svelte:head>
	<title>{content.metaTitle}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-dark-bg py-8 px-4 sm:px-6 lg:px-8">
	<div class="max-w-3xl mx-auto">
		<div
			class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between animate-fade-in-down"
		>
			<div>
				<h1 class="text-3xl font-bold dark:text-white">
					{content.title} <span class="text-gold">{content.titleHighlight}</span>
				</h1>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					{content.description}
				</p>
			</div>

			<div
				class="inline-flex w-fit items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm dark:border-dark-border dark:bg-dark-surface"
				aria-label={content.languageLabel}
			>
				<button
					type="button"
					class={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
						language === "th"
							? "bg-amber-500 text-white shadow-sm"
							: "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
					}`}
					on:click={() => setLanguage("th")}
				>
					TH
				</button>
				<button
					type="button"
					class={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
						language === "en"
							? "bg-amber-500 text-white shadow-sm"
							: "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
					}`}
					on:click={() => setLanguage("en")}
				>
					ENG
				</button>
			</div>
		</div>

		<div class="space-y-6">
			<section class="p-6 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border animate-fade-in-up">
				<div class="flex items-center gap-3 mb-4">
					<div class="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xl">
						&#x1F3C6;
					</div>
					<h2 class="text-xl font-bold dark:text-white">{content.sections.points.title}</h2>
				</div>
				<div class="space-y-3 text-sm text-gray-600 dark:text-gray-300">
					<p>{content.sections.points.description}</p>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
						{#each content.sections.points.items as item}
							<div class="p-3 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border">
								<div class="font-semibold dark:text-white">{item.title}</div>
								<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.description}</div>
							</div>
						{/each}
					</div>
				</div>
			</section>

			<section class="p-6 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border animate-fade-in-up">
				<div class="flex items-center gap-3 mb-4">
					<div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl">
						&#x1F4CB;
					</div>
					<h2 class="text-xl font-bold dark:text-white">{content.sections.rules.title}</h2>
				</div>
				<ol class="space-y-3 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
					{#each content.sections.rules.items as item}
						<li>{item}</li>
					{/each}
				</ol>
			</section>

			<section class="p-6 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border animate-fade-in-up">
				<div class="flex items-center gap-3 mb-4">
					<div class="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xl">
						&#x1F30D;
					</div>
					<h2 class="text-xl font-bold dark:text-white">{content.sections.sessions.title}</h2>
				</div>
				<div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
					<p>{content.sections.sessions.description}</p>
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
						{#each content.sections.sessions.items as item}
							<div class="p-3 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border text-center">
								<div class="font-semibold dark:text-white">{item.title}</div>
								<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.description}</div>
							</div>
						{/each}
					</div>
				</div>
			</section>

			<section class="p-6 rounded-xl bg-white dark:bg-dark-surface border border-red-200 dark:border-red-900/50 animate-fade-in-up">
				<div class="flex items-center gap-3 mb-4">
					<div class="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xl">
						&#x26A0;&#xFE0F;
					</div>
					<h2 class="text-xl font-bold dark:text-white">
						{content.sections.disqualification.title}
					</h2>
				</div>
				<ul class="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
					{#each content.sections.disqualification.items as item}
						<li>{item}</li>
					{/each}
				</ul>
			</section>
		</div>

		<div class="mt-8 text-center">
			<a
				href="/leaderboard"
				class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium rounded-lg transition-all hover:scale-105 active:scale-95 shadow-sm"
			>
				{content.cta} &rarr;
			</a>
		</div>
	</div>
</div>
