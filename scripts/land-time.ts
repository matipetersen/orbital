// Dev tool: how long the rival spends landing on every stage (landing guidance on until touchdown).
// Run: npx vite-node scripts/land-time.ts   (RACE=guerra to limit, V=1 for one line per stage)
import { mulberry32 } from '../src/sim/rng';
import { RIVAL_AI, RivalDriver } from '../src/arcade/ai';
import { Arena, BASE_STATS, STEP } from '../src/arcade/arena';
import { landTarget } from '../src/arcade/land';
import { rivalPace } from '../src/arcade/mission';
import { RACES } from '../src/arcade/races';

const only = process.env.RACE;
const reasons: Record<string, number> = {};
let n = 0, landSum = 0, totSum = 0, fails = 0, deaths = 0, worst: [number, string][] = [];
for (const race of RACES) {
  if (only && race.id !== only) continue;
  race.stages.forEach((def, i) => {
    if (def.sprint || def.field) return;
    const arena = new Arena(def);
    const pace = rivalPace(def, 1);
    const ship = arena.addShip({ isPlayer: false, name: 'r', color: '#f0f', stats: { ...BASE_STATS, thrust: 150 * def.rival.skill * (0.55 + 0.45 * pace), turnRate: 3.6 }, start: def.rivalStart, orbit: def.startAt ? { ...def.startAt, angle: def.startAt.angle + 9 * (def.startAt.dir ?? 1) } : undefined, infiniteFuel: true });
    const d = new RivalDriver(mulberry32(1000 + i), { ...(def.rival.ai ?? RIVAL_AI), pace });
    let landT = 0, dd = 0;
    while (arena.t < 300 && !ship.finished) {
      const finalLeg = ship.nextGate >= ship.route.length - 1 && ship.status === 'flying' && landTarget(arena, ship) && !ship.route[ship.nextGate]?.land;
      arena.step([d.control(arena, ship)], STEP);
      if (finalLeg || (ship.nextGate >= ship.route.length && ship.status === 'flying')) landT += STEP;
      for (const e of arena.events) if (e.type === 'die') { dd++; if (process.env.R) reasons[(e as { reason?: string }).reason ?? '?'] = (reasons[(e as { reason?: string }).reason ?? '?'] ?? 0) + 1; }
      arena.events.length = 0;
    }
    n++;
    deaths += dd;
    if (!ship.finished) { fails++; console.log('NO FINISH', race.id, i + 1, def.name); return; }
    landSum += landT; totSum += ship.finishTime;
    worst.push([landT, `${race.id} S${i + 1} ${def.name}`]);
    if (process.env.V) console.log(`${race.id.padEnd(12)} S${i + 1} ${def.name.slice(0, 22).padEnd(22)} total ${ship.finishTime.toFixed(0).padStart(4)}s  aterrizaje ${landT.toFixed(1).padStart(5)}s  muertes ${dd}`);
  });
}
if (process.env.R) console.log('causas', JSON.stringify(reasons));
worst.sort((a, b) => b[0] - a[0]);
console.log(`etapas ${n}  sin terminar ${fails}  muertes ${deaths}  aterrizaje medio ${(landSum / (n - fails)).toFixed(1)}s  total medio ${(totSum / (n - fails)).toFixed(1)}s`);
console.log('peores:', worst.slice(0, 6).map(([t, s]) => `${s} ${t.toFixed(1)}s`).join(' · '));
