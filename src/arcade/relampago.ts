import { generateStage } from './procgen';
import { makeSprintStage } from './sprint';
import { type RaceDef } from './types';

const SEED = 11;

/**
 * A short race for a quick session: four fast stages (a hop, a fall, a sprint, a slalom), about
 * thirty seconds each, so the whole mission takes around two minutes.
 */
export const RELAMPAGO: RaceDef = {
  id: 'relampago',
  name: 'CARRERA RELÁMPAGO',
  subtitle: 'Cuatro etapas cortas · unos 2 minutos',
  blurb: 'Un salto, una caída libre, un sprint entre rocas y un slalom. Etapas de unos treinta segundos, sin descanso: toda la misión dura alrededor de dos minutos.',
  stages: [
    generateStage(SEED, 0, 0.15, 'hop'),
    generateStage(SEED, 1, 0.3, 'fall'),
    makeSprintStage(SEED + 7, 0.3),
    generateStage(SEED, 3, 0.45, 'gauntlet'),
  ].map((st, i) => ({ ...st, id: i + 1, kind: st.kind ?? 'Clásica' })),
};
