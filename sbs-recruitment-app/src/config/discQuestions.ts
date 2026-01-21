// ==============================================
// DISC Questions Configuration
// ==============================================

import type { DiscQuestion } from '@/types'

// DISC scoring: S and C profiles are preferred (higher points)
// D and I profiles are less preferred (lower points)
export const discQuestions: DiscQuestion[] = [
	{
		id: 1,
		question: 'Hvordan foretrækker du at arbejde?',
		options: [
			{ text: 'Jeg tager gerne styringen og træffer hurtige beslutninger', profile: 'D', points: 1 },
			{ text: 'Jeg elsker at samarbejde og motivere andre', profile: 'I', points: 2 },
			{ text: 'Jeg foretrækker et stabilt og forudsigeligt arbejdsmiljø', profile: 'S', points: 3 },
			{ text: 'Jeg fokuserer på detaljer og sikrer kvalitet', profile: 'C', points: 3 }
		]
	},
	{
		id: 2,
		question: 'Når du står over for en udfordring, hvad gør du så?',
		options: [
			{ text: 'Jeg tager fat med det samme og finder en løsning', profile: 'D', points: 1 },
			{ text: 'Jeg taler med andre for at få deres perspektiv', profile: 'I', points: 2 },
			{ text: 'Jeg tænker grundigt over situationen før jeg handler', profile: 'S', points: 3 },
			{ text: 'Jeg analyserer problemet systematisk', profile: 'C', points: 3 }
		]
	},
	{
		id: 3,
		question: 'Hvad motiverer dig mest i dit arbejde?',
		options: [
			{ text: 'At opnå resultater og nå mine mål', profile: 'D', points: 1 },
			{ text: 'At få anerkendelse og være social med kollegaer', profile: 'I', points: 2 },
			{ text: 'At have tryghed og et godt arbejdsmiljø', profile: 'S', points: 3 },
			{ text: 'At gøre tingene rigtigt og følge procedurer', profile: 'C', points: 3 }
		]
	},
	{
		id: 4,
		question: 'Hvordan håndterer du forandringer?',
		options: [
			{ text: 'Jeg ser det som en mulighed for at prøve noget nyt', profile: 'D', points: 2 },
			{ text: 'Jeg tilpasser mig hurtigt og hjælper andre med at gøre det samme', profile: 'I', points: 2 },
			{ text: 'Jeg foretrækker gradvis forandring med god forberedelse', profile: 'S', points: 3 },
			{ text: 'Jeg vil gerne forstå årsagen og have en klar plan', profile: 'C', points: 3 }
		]
	},
	{
		id: 5,
		question: 'Hvordan beskriver dine kollegaer dig bedst?',
		options: [
			{ text: 'Målfokuseret og beslutsom', profile: 'D', points: 1 },
			{ text: 'Entusiastisk og udadvendt', profile: 'I', points: 2 },
			{ text: 'Tålmodig og pålidelig', profile: 'S', points: 3 },
			{ text: 'Præcis og grundig', profile: 'C', points: 3 }
		]
	}
]

// Qualification threshold
export const QUALIFICATION_THRESHOLD = 11

// Maximum points possible
export const MAX_POINTS = 15
