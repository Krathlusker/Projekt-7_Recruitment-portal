// ==============================================
// DISC Questions Configuration
// ==============================================

import type { DiscQuestion } from '@/types'

// DISC scoring: S and C profiles are preferred (higher points)
// D and I profiles are less preferred (lower points)
export const discQuestions: DiscQuestion[] = [
	{
		id: 1,
		question: 'Hvordan foretraekker du at arbejde?',
		options: [
			{ text: 'Jeg tager gerne styringen og traffer hurtige beslutninger', profile: 'D', points: 1 },
			{ text: 'Jeg elsker at samarbejde og motivere andre', profile: 'I', points: 2 },
			{ text: 'Jeg foretraekker et stabilt og forudsigeligt arbejdsmiljo', profile: 'S', points: 3 },
			{ text: 'Jeg fokuserer pa detaljer og sikrer kvalitet', profile: 'C', points: 3 }
		]
	},
	{
		id: 2,
		question: 'Nar du star over for en udfordring, hvad gor du sa?',
		options: [
			{ text: 'Jeg tager fat med det samme og finder en losning', profile: 'D', points: 1 },
			{ text: 'Jeg taler med andre for at fa deres perspektiv', profile: 'I', points: 2 },
			{ text: 'Jeg tanker grundigt over situationen for jeg handler', profile: 'S', points: 3 },
			{ text: 'Jeg analyserer problemet systematisk', profile: 'C', points: 3 }
		]
	},
	{
		id: 3,
		question: 'Hvad motiverer dig mest i dit arbejde?',
		options: [
			{ text: 'At opna resultater og na mine mal', profile: 'D', points: 1 },
			{ text: 'At fa anerkendelse og vaere social med kollegaer', profile: 'I', points: 2 },
			{ text: 'At have tryghed og et godt arbejdsmiljo', profile: 'S', points: 3 },
			{ text: 'At gore tingene rigtigt og folge procedurer', profile: 'C', points: 3 }
		]
	},
	{
		id: 4,
		question: 'Hvordan haandterer du forandringer?',
		options: [
			{ text: 'Jeg ser det som en mulighed for at prove noget nyt', profile: 'D', points: 2 },
			{ text: 'Jeg tilpasser mig hurtigt og hjaelper andre med at gore det samme', profile: 'I', points: 2 },
			{ text: 'Jeg foretraekker gradvis forandring med god forberedelse', profile: 'S', points: 3 },
			{ text: 'Jeg vil gerne forsta arsagen og have en klar plan', profile: 'C', points: 3 }
		]
	},
	{
		id: 5,
		question: 'Hvordan beskriver dine kollegaer dig bedst?',
		options: [
			{ text: 'Malfokuseret og beslutsom', profile: 'D', points: 1 },
			{ text: 'Entusiastisk og udadvendt', profile: 'I', points: 2 },
			{ text: 'Talmodig og palidelig', profile: 'S', points: 3 },
			{ text: 'Praecis og grundig', profile: 'C', points: 3 }
		]
	}
]

// Qualification threshold
export const QUALIFICATION_THRESHOLD = 11

// Maximum points possible
export const MAX_POINTS = 15
