/*
 * Gender-neutral, clinically-sourced phase guide content.
 */

import { CyclePhase } from './engine';

export interface PhaseInfo {
  name: string;
  shortName: string;
  body: string;
  movement: string;
  nutrition: string;
  mindset: string;
  color: string;
}

const PHASE_INFO: Record<CyclePhase, PhaseInfo> = {
  menstrual: {
    name: 'Menstrual Phase',
    shortName: 'Menstrual',
    body: 'Hormone levels are at their lowest. The uterine lining sheds. Energy may feel lower than usual, and rest is beneficial.',
    movement: 'Gentle movement like walking, stretching, or yoga can help with cramps. Listen to your body and rest if needed.',
    nutrition: 'Iron-rich foods (leafy greens, legumes) help replenish what\'s lost. Stay hydrated and consider warm, comforting foods.',
    mindset: 'A natural time for reflection and rest. It\'s okay to slow down and prioritize self-care.',
    color: '#6B7280',
  },
  follicular: {
    name: 'Follicular Phase',
    shortName: 'Follicular',
    body: 'Estrogen rises as follicles develop. Energy typically increases. The body prepares for potential ovulation.',
    movement: 'Energy levels often support more intense workouts. Good time to try new activities or increase training intensity.',
    nutrition: 'Focus on lean proteins and fresh vegetables. Fermented foods support gut health during this phase.',
    mindset: 'Often a phase of creativity and new beginnings. Good time for planning and starting new projects.',
    color: '#3B82F6',
  },
  ovulation: {
    name: 'Ovulation Phase',
    shortName: 'Ovulation',
    body: 'An egg is released. Estrogen peaks, and you may notice changes in cervical mucus. This is the fertile window.',
    movement: 'Energy is typically at its highest. High-intensity workouts and strength training are well-supported.',
    nutrition: 'Antioxidant-rich foods and fiber support hormone metabolism. Stay well-hydrated.',
    mindset: 'Often a phase of confidence and social energy. Communication may feel easier.',
    color: '#059669',
  },
  luteal: {
    name: 'Luteal Phase',
    shortName: 'Luteal',
    body: 'Progesterone rises after ovulation. Body temperature increases slightly. PMS symptoms may appear in the late luteal phase.',
    movement: 'Moderate exercise remains beneficial. Towards the end, you may prefer lower-intensity activities.',
    nutrition: 'Complex carbohydrates can help with mood. Magnesium-rich foods (nuts, dark chocolate) may ease symptoms.',
    mindset: 'A time for completion and wrapping up projects. Attention to detail may increase. Be gentle with yourself if mood shifts occur.',
    color: '#8B5CF6',
  },
};

export function getPhaseInfo(phase: CyclePhase): PhaseInfo {
  return PHASE_INFO[phase];
}

