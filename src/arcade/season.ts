import { mulberry32 } from '../sim/rng';
import { type Upgrades, UPGRADES, UPGRADE_SLOTS, usedSlots, zeroUpgrades } from './meta';
import { makeGrandPrix } from './procgen';
import { type RaceDef, type StageDef } from './types';

/**
 * The championship: a season of Grands Prix with ten teams of two ships, points for the top ten, money
 * to develop the ship, a setup to pick before each race and a decision to take between races.
 * Everything here is plain data so it can be saved and tested without the game running.
 */

export const ROUNDS = 8;
export const LAPS = 3;
/** Points for 1st to 10th place, as in Formula 1. */
export const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
/** Seconds the race stays open for the player after the winner lands (the chequered flag). */
export const CLOSING = 45;
/** Base strength of the AI field, the same scale as the daily Grand Prix's rivals. */
const AI_SKILL = 0.7;
/** Rival field strength by difficulty: thrust and cruise pace. */
export const DIFFICULTY = [
  { name: 'FÁCIL', thrust: 0.9, pace: -0.06 },
  { name: 'NORMAL', thrust: 1, pace: 0 },
  { name: 'DIFÍCIL', thrust: 1.08, pace: 0.05 },
];

export type Trait = 'rocas' | 'gravedad' | 'atmosfera' | 'lunas' | 'clasico';
export const TRAITS: Record<Trait, { name: string; desc: string }> = {
  rocas: { name: 'Cinturón denso', desc: 'El doble de rocas en la órbita de los aros: el casco sufre.' },
  gravedad: { name: 'Planeta pesado', desc: 'Gravedad un 35 % más fuerte: despegar y frenar cuestan más empuje.' },
  atmosfera: { name: 'Atmósfera espesa', desc: 'Mucho rozamiento cerca del suelo: frena y gasta combustible.' },
  lunas: { name: 'Lunas rápidas', desc: 'Las dos lunas orbitan al doble de velocidad y cruzan la pista.' },
  clasico: { name: 'Circuito clásico', desc: 'Sin sorpresas: gana el que mejor vuela.' },
};

export type EngineMap = 'potencia' | 'equilibrio' | 'ahorro';
export type HullSetup = 'ligero' | 'estandar' | 'blindado';
export const ENGINE_MAPS: Record<EngineMap, { name: string; desc: string; thrust: number; fuel: number }> = {
  potencia: { name: 'Potencia', desc: '+12 % de empuje, 25 % menos de combustible', thrust: 1.12, fuel: 0.75 },
  equilibrio: { name: 'Equilibrado', desc: 'Sin cambios', thrust: 1, fuel: 1 },
  ahorro: { name: 'Ahorro', desc: '-8 % de empuje, 35 % más de combustible', thrust: 0.92, fuel: 1.35 },
};
export const HULL_SETUPS: Record<HullSetup, { name: string; desc: string; hull: number; turn: number; thrust: number }> = {
  ligero: { name: 'Ligero', desc: '+15 % de giro, 30 % menos de casco', hull: 0.7, turn: 1.15, thrust: 1 },
  estandar: { name: 'Estándar', desc: 'Sin cambios', hull: 1, turn: 1, thrust: 1 },
  blindado: { name: 'Blindado', desc: '+50 % de casco, -10 % de giro, -3 % de empuje', hull: 1.5, turn: 0.9, thrust: 0.97 },
};

/** Multipliers applied to the player's ship for one race. */
export interface Tune {
  thrust: number;
  fuel: number;
  hull: number;
  turn: number;
}

export interface Team {
  name: string;
  color: string;
  /** Car performance, around 0.9 to 1.05; AI teams develop it during the season. */
  car: number;
  points: number;
}

export interface Driver {
  name: string;
  team: number;
  /** Pilot skill, around 0.92 to 1.06. */
  talent: number;
  points: number;
  wins: number;
  podiums: number;
  player?: boolean;
}

export interface RoundInfo {
  seed: number;
  trait: Trait;
  name?: string;
  /** Driver indices in finishing order, and which of them did not finish. */
  order?: number[];
  dnf?: number[];
  playerPlace?: number;
}

/** Effects waiting for the next race, set by decisions. */
export interface Pending {
  tune: Tune;
  /** Chance of disqualification for the player in the next race. */
  dqRisk: number;
  /** Bonus credits if the player finishes in the top `pos`. */
  bonus: { pos: number; credits: number } | null;
  /** Talent change for the championship leader in the next race only. */
  leaderNerf: number;
  /** Extra hull for the next race (bought armour). */
  hull: number;
}

export interface Season {
  version: 1;
  seed: number;
  round: number;
  rounds: RoundInfo[];
  teams: Team[];
  drivers: Driver[];
  credits: number;
  upgrades: Upgrades;
  engine: EngineMap;
  hullSetup: HullSetup;
  pending: Pending;
  /** Decision to take before the next race, by id, or null once taken. */
  event: string | null;
  /** Ids of decisions already seen this season, so they do not repeat. */
  seen: string[];
  /** What happened in the last decision or race, for the hub. */
  news: string[];
  /** Disqualifications suffered (for the record). */
  dq: number;
  /** 0 easy, 1 normal, 2 hard. */
  difficulty: number;
  done: boolean;
}

const TEAM_DEFS: [string, string][] = [
  ['Orbital Racing', '#00f0ff'],
  ['Nébula GP', '#ff2bd6'],
  ['Ámbar Motorsport', '#ffb000'],
  ['Verdant Kinetics', '#7dff6b'],
  ['Violeta Astral', '#b46bff'],
  ['Brasa Racing', '#ff6a3c'],
  ['Cobalto Team', '#2f9bff'],
  ['Solar Amarillo', '#ffe14a'],
  ['Rubí Orbital', '#ff4d8d'],
  ['Turquesa Dinámica', '#4dffd2'],
];

const DRIVER_NAMES = [
  'Vega', 'Okafor', 'Lindqvist', 'Moreau', 'Takeda', 'Ferreira', 'Kowalski', 'Ibarra', 'Novak', 'Achebe',
  'Rossi', 'Haldane', 'Sato', 'Delacroix', 'Mendes', 'Varga', 'Quiroga', 'Nakamura', 'Brandt',
];

const r2 = (n: number): number => Math.round(n * 1000) / 1000;
const neutralTune = (): Tune => ({ thrust: 1, fuel: 1, hull: 1, turn: 1 });
const freshPending = (): Pending => ({ tune: neutralTune(), dqRisk: 0, bonus: null, leaderNerf: 0, hull: 0 });

export function newSeason(seed = Math.floor(Math.random() * 1e9), difficulty = 1): Season {
  const rnd = mulberry32(seed);
  const teams: Team[] = TEAM_DEFS.map(([name, color], i) => ({ name, color, car: i === 0 ? 1 : r2(0.9 + 0.13 * rnd()), points: 0 }));
  const names = [...DRIVER_NAMES];
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }
  const drivers: Driver[] = [{ name: 'Vos', team: 0, talent: 1, points: 0, wins: 0, podiums: 0, player: true }];
  for (let t = 0; t < teams.length; t++) {
    for (let k = t === 0 ? 1 : 0; k < 2; k++) drivers.push({ name: names.pop()!, team: t, talent: r2(0.92 + 0.14 * rnd()), points: 0, wins: 0, podiums: 0 });
  }
  const traits: Trait[] = ['clasico', 'rocas', 'gravedad', 'atmosfera', 'lunas'];
  const rounds: RoundInfo[] = Array.from({ length: ROUNDS }, (_, i) => ({
    seed: Math.floor(rnd() * 1e6) + i,
    trait: i === 0 ? 'clasico' : traits[Math.floor(rnd() * traits.length)],
  }));
  return {
    version: 1,
    seed,
    round: 0,
    rounds,
    teams,
    drivers,
    credits: 300,
    upgrades: zeroUpgrades(),
    engine: 'equilibrio',
    hullSetup: 'estandar',
    pending: freshPending(),
    event: null,
    seen: [],
    news: ['Arranca la temporada: ocho Grandes Premios, veinte naves y puntos para los diez primeros.'],
    dq: 0,
    difficulty,
    done: false,
  };
}

/** The player's tune for the next race: setup choices times pending effects. */
export function raceTune(s: Season): Tune {
  const e = ENGINE_MAPS[s.engine];
  const hs = HULL_SETUPS[s.hullSetup];
  const p = s.pending.tune;
  return {
    thrust: r2(e.thrust * hs.thrust * p.thrust * s.teams[0].car),
    fuel: r2(e.fuel * p.fuel),
    hull: r2(hs.hull * p.hull * (1 + s.pending.hull)),
    turn: r2(hs.turn * p.turn),
  };
}

/** The AI ships of a race in driver order (the player excluded), with their colour and strength. */
export interface RosterEntry {
  driver: number;
  name: string;
  color: string;
  thrust: number;
  pace: number;
  noise: number;
}

export function roster(s: Season): RosterEntry[] {
  const leader = standings(s)[0];
  const diff = DIFFICULTY[s.difficulty ?? 1];
  const out: RosterEntry[] = [];
  s.drivers.forEach((d, i) => {
    if (d.player) return;
    const team = s.teams[d.team];
    const talent = d.talent + (i === leader && s.pending.leaderNerf ? s.pending.leaderNerf : 0);
    const k = team.car * talent;
    out.push({
      driver: i,
      name: d.name,
      color: team.color,
      thrust: Math.round(150 * AI_SKILL * k * diff.thrust),
      pace: r2(Math.max(0.64, Math.min(1, 0.7 + (k - 0.82) + diff.pace))),
      noise: r2(Math.max(0.1, Math.min(0.4, 0.34 - (talent - 0.92) * 1.5))),
    });
  });
  return out;
}

/** The Grand Prix of the current round: twenty ships, three laps, the trait of the circuit applied. */
export function seasonRace(s: Season): RaceDef {
  const info = s.rounds[s.round];
  const ai = roster(s);
  const base = makeGrandPrix(info.seed, ai.length + 1).stages[0];
  const st: StageDef = JSON.parse(JSON.stringify(base));
  const f = st.field!;
  f.laps = LAPS;
  // Everybody who lands is classified; the race closes a while after the winner lands.
  f.podium = ai.length + 1;
  f.closing = CLOSING;
  f.roster = ai.map((r) => ({ name: r.name, color: r.color, thrust: r.thrust, pace: r.pace, noise: r.noise }));
  const planet = st.bodies[0];
  if (info.trait === 'rocas') st.asteroids = st.asteroids.map((a) => ({ ...a, count: a.count * 2 + 6 }));
  if (info.trait === 'gravedad') planet.g = Math.round(planet.g * 1.35);
  if (info.trait === 'atmosfera') planet.atm = { h: 70, drag: 0.009 };
  if (info.trait === 'lunas') for (const b of st.bodies) if (b.orbit) b.orbit.omega *= 2;
  const name = st.name.replace('Gran Premio de', 'GP de');
  st.name = name;
  st.kind = 'Campeonato';
  st.par = 150;
  st.blurb = `Ronda ${s.round + 1} de ${ROUNDS}. ${ai.length + 1} naves, ${LAPS} vueltas desde tu propia plataforma y aterrizaje en ella. ${TRAITS[info.trait].desc} Puntos para los diez primeros.`;
  return { id: `temporada-${s.round + 1}`, name: name.toUpperCase(), subtitle: `Campeonato · ronda ${s.round + 1}`, blurb: st.blurb, stages: [st] };
}

/** Driver indices by championship points (ties broken by wins, then podiums). */
export function standings(s: Season): number[] {
  return s.drivers.map((_, i) => i).sort((a, b) => {
    const A = s.drivers[a];
    const B = s.drivers[b];
    return B.points - A.points || B.wins - A.wins || B.podiums - A.podiums || a - b;
  });
}

export function teamStandings(s: Season): number[] {
  return s.teams.map((_, i) => i).sort((a, b) => s.teams[b].points - s.teams[a].points || a - b);
}

export const pointsFor = (place: number): number => POINTS[place - 1] ?? 0;

/** Credits paid by the team after a race: a base budget plus prize money for points. */
export const prizeFor = (place: number | null): number => 120 + 10 * (place ? pointsFor(place) : 0);

export interface RaceOutcome {
  /** Driver indices in finishing order (classified first, then retirements). */
  order: number[];
  dnf: number[];
  playerPlace: number | null;
  disqualified: boolean;
  credits: number;
  bonus: number;
  lines: string[];
}

/**
 * Applies a race result. `order` lists every driver index from first to last as the race ended;
 * `dnf` the ones that did not finish (the player when out of lives or retired).
 */
export function applyRace(s: Season, order: number[], dnf: number[], rnd: () => number = Math.random): RaceOutcome {
  const lines: string[] = [];
  const player = s.drivers.findIndex((d) => d.player);
  let classified = order.filter((d) => !dnf.includes(d));
  let disqualified = false;
  if (s.pending.dqRisk > 0 && classified.includes(player) && rnd() < s.pending.dqRisk) {
    disqualified = true;
    s.dq++;
    classified = classified.filter((d) => d !== player);
    lines.push('Los comisarios revisaron tu nave: DESCALIFICADO. Perdés los puntos de esta carrera.');
  }
  const finalOrder = [...classified, ...order.filter((d) => !classified.includes(d))];
  classified.forEach((d, i) => {
    const pts = pointsFor(i + 1);
    const drv = s.drivers[d];
    drv.points += pts;
    s.teams[drv.team].points += pts;
    if (i === 0) drv.wins++;
    if (i < 3) drv.podiums++;
  });
  const pIdx = classified.indexOf(player);
  const playerPlace = pIdx >= 0 ? pIdx + 1 : null;
  let credits = prizeFor(playerPlace);
  let bonus = 0;
  const b = s.pending.bonus;
  if (b) {
    if (playerPlace && playerPlace <= b.pos) {
      bonus = b.credits;
      lines.push(`El patrocinador cumple: +${b.credits} créditos por terminar entre los ${b.pos} primeros.`);
    } else lines.push(`No llegaste al top ${b.pos}: el patrocinador no paga el bono.`);
  }
  credits += bonus;
  s.credits += credits;
  const info = s.rounds[s.round];
  info.order = finalOrder;
  info.dnf = dnf;
  info.playerPlace = playerPlace ?? undefined;
  const winner = s.drivers[classified[0]];
  if (winner) lines.unshift(`${winner.player ? '¡Ganaste' : `Ganó ${winner.name} (${s.teams[winner.team].name})`}${winner.player ? ' el Gran Premio!' : '.'}`);
  // AI teams develop their ships between races; the player develops through the shop and decisions.
  s.teams.forEach((t, i) => {
    if (i === 0) return;
    t.car = r2(Math.min(1.12, t.car + 0.004 + 0.01 * rnd()));
  });
  s.pending = freshPending();
  s.round++;
  if (s.round >= ROUNDS) {
    s.done = true;
    const champ = s.drivers[standings(s)[0]];
    lines.push(champ.player ? '¡CAMPEÓN DEL MUNDO!' : `${champ.name} es campeón con ${champ.points} puntos.`);
  } else s.event = drawEvent(s, rnd);
  s.news = lines;
  return { order: finalOrder, dnf, playerPlace, disqualified, credits, bonus, lines };
}

// ------------------------------------------------------------ decisions

export interface Choice {
  label: string;
  desc: string;
  /** Credits it costs up front (refused if the team cannot pay). */
  cost?: number;
  apply: (s: Season, rnd: () => number) => string;
}

export interface DecisionCard {
  id: string;
  title: string;
  text: (s: Season) => string;
  choices: Choice[];
}

const teammate = (s: Season): Driver => s.drivers.find((d) => d.team === 0 && !d.player)!;

export const DECISIONS: DecisionCard[] = [
  {
    id: 'patrocinador',
    title: 'UN PATROCINADOR LLAMA',
    text: () => 'Una marca de combustible quiere tu logo en la nave. Paga ahora poco, o mucho más si rendís en la próxima carrera.',
    choices: [
      { label: 'COBRAR YA', desc: '+150 créditos ahora', apply: (s) => { s.credits += 150; return 'Cobraste 150 créditos del patrocinador.'; } },
      { label: 'APOSTAR AL TOP 5', desc: '+450 créditos si terminás entre los 5 primeros; nada si no', apply: (s) => { s.pending.bonus = { pos: 5, credits: 450 }; return 'Apostaste: 450 créditos si terminás entre los 5 primeros.'; } },
    ],
  },
  {
    id: 'ingeniero',
    title: 'FICHAJE DE INGENIERO',
    text: () => 'El jefe de motores de un equipo rival quiere pasarse a tu escudería. Es caro, pero la mejora queda para toda la temporada.',
    choices: [
      { label: 'CONTRATARLO', desc: '-250 créditos, +4 % de empuje para el resto de la temporada', cost: 250, apply: (s) => { s.credits -= 250; s.teams[0].car = r2(s.teams[0].car * 1.04); return 'Nuevo jefe de motores: +4 % de empuje desde ya.'; } },
      { label: 'NO, GRACIAS', desc: 'Guardás el dinero', apply: () => 'Rechazaste el fichaje.' },
    ],
  },
  {
    id: 'trampa',
    title: 'UNA PIEZA EN EL LÍMITE',
    text: () => 'Tus mecánicos encontraron un hueco en el reglamento: un inyector que da más empuje. Si los comisarios lo revisan, te descalifican.',
    choices: [
      { label: 'USARLO', desc: '+8 % de empuje en la próxima carrera, 35 % de riesgo de descalificación', apply: (s) => { s.pending.tune.thrust *= 1.08; s.pending.dqRisk = 0.35; return 'Montaste el inyector. Ojalá nadie mire.'; } },
      { label: 'JUGAR LIMPIO', desc: 'Sin riesgo, +40 créditos de imagen', apply: (s) => { s.credits += 40; return 'Jugás limpio: la prensa lo valora (+40 créditos).'; } },
    ],
  },
  {
    id: 'companero',
    title: 'TU COMPAÑERO PIDE PRIORIDAD',
    text: (s) => `${teammate(s).name} quiere las mejores piezas para la próxima carrera. La escudería suma puntos con los dos.`,
    choices: [
      { label: 'DÁRSELAS', desc: 'Tu compañero va más rápido (+4 %) el resto del año; vos -3 % de empuje la próxima carrera', apply: (s) => { teammate(s).talent = r2(teammate(s).talent + 0.04); s.pending.tune.thrust *= 0.97; return `${teammate(s).name} recibe las mejores piezas.`; } },
      { label: 'NEGARSE', desc: 'Tu compañero se enoja: -3 % de rendimiento el resto del año', apply: (s) => { teammate(s).talent = r2(teammate(s).talent - 0.03); return `${teammate(s).name} no está contento.`; } },
    ],
  },
  {
    id: 'meteoritos',
    title: 'ALERTA DE METEORITOS',
    text: () => 'El servicio meteorológico avisa de una lluvia de rocas en el próximo circuito.',
    choices: [
      { label: 'BLINDAR LA NAVE', desc: '-120 créditos, +40 % de casco en la próxima carrera', cost: 120, apply: (s) => { s.credits -= 120; s.pending.hull += 0.4; s.rounds[s.round].trait = 'rocas'; return 'Blindaje extra montado para la lluvia de rocas.'; } },
      { label: 'ARRIESGAR', desc: 'Sin gasto: el circuito tendrá el doble de rocas', apply: (s) => { s.rounds[s.round].trait = 'rocas'; return 'Vas sin blindaje extra a un circuito lleno de rocas.'; } },
    ],
  },
  {
    id: 'prensa',
    title: 'RUEDA DE PRENSA',
    text: (s) => `Te preguntan por ${s.drivers[standings(s)[0]].player ? 'tu liderazgo' : s.drivers[standings(s)[0]].name + ', el líder del campeonato'}.`,
    choices: [
      { label: 'PROVOCAR AL LÍDER', desc: 'El líder corre presionado (-5 %) la próxima carrera; si el líder sos vos, no tiene efecto', apply: (s) => { s.pending.leaderNerf = -0.05; return 'Le metiste presión al líder.'; } },
      { label: 'PERFIL BAJO', desc: '+70 créditos de los patrocinadores', apply: (s) => { s.credits += 70; return 'Respuesta prudente: +70 créditos.'; } },
    ],
  },
  {
    id: 'tunel',
    title: 'HORAS DE SIMULADOR',
    text: () => 'Hay horas de simulador para una sola cosa: preparar la próxima carrera o desarrollar la nave para el futuro.',
    choices: [
      { label: 'LA PRÓXIMA CARRERA', desc: '+6 % de empuje y +10 % de giro solo en la próxima', apply: (s) => { s.pending.tune.thrust *= 1.06; s.pending.tune.turn *= 1.1; return 'Preparación a fondo para la próxima carrera.'; } },
      { label: 'EL FUTURO', desc: '+2 % de empuje para el resto de la temporada', apply: (s) => { s.teams[0].car = r2(s.teams[0].car * 1.02); return 'Desarrollo a largo plazo: +2 % de empuje.'; } },
    ],
  },
  {
    id: 'tanque',
    title: 'NUEVO REGLAMENTO DE COMBUSTIBLE',
    text: () => 'La federación limita el combustible en la próxima carrera. Podés pagar un tanque homologado de mayor capacidad o adaptar la estrategia.',
    choices: [
      { label: 'TANQUE NUEVO', desc: '-100 créditos, sin pérdida de combustible', cost: 100, apply: (s) => { s.credits -= 100; return 'Tanque homologado: corrés con el combustible completo.'; } },
      { label: 'ADAPTARSE', desc: '-20 % de combustible la próxima carrera (pensá en una parada en boxes)', apply: (s) => { s.pending.tune.fuel *= 0.8; return 'Corrés con 20 % menos de combustible: quizás convenga parar en boxes.'; } },
    ],
  },
];

export const decisionById = (id: string | null): DecisionCard | null => DECISIONS.find((d) => d.id === id) ?? null;

function drawEvent(s: Season, rnd: () => number): string | null {
  const left = DECISIONS.filter((d) => !s.seen.includes(d.id));
  if (!left.length) return null;
  const card = left[Math.floor(rnd() * left.length)];
  s.seen.push(card.id);
  return card.id;
}

/** Takes a decision. Returns the news line, or null if the team cannot pay for that choice. */
export function decide(s: Season, choice: number, rnd: () => number = Math.random): string | null {
  const card = decisionById(s.event);
  const c = card?.choices[choice];
  if (!card || !c) return null;
  if (c.cost && s.credits < c.cost) return null;
  const line = c.apply(s, rnd);
  s.event = null;
  s.news = [line];
  return line;
}

// ------------------------------------------------------------- the shop

export function upgradeCost(s: Season, id: keyof Upgrades): number | null {
  const def = UPGRADES.find((d) => d.id === id);
  if (!def) return null;
  const level = s.upgrades[id];
  if (level >= def.max) return null;
  if (level === 0 && usedSlots(s.upgrades) >= UPGRADE_SLOTS) return null;
  return def.cost(level);
}

/** Buys a level of an upgrade with team credits; upgrades last the whole season. */
export function buySeasonUpgrade(s: Season, id: keyof Upgrades): boolean {
  const cost = upgradeCost(s, id);
  if (cost === null || s.credits < cost) return false;
  s.credits -= cost;
  s.upgrades[id]++;
  return true;
}

// -------------------------------------------------------------- storage

const KEY = 'orbital.season.v1';

export function loadSeason(): Season | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Season;
    return s.version === 1 ? s : null;
  } catch {
    return null;
  }
}

export function saveSeason(s: Season | null): void {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the season lasts for this session only */
  }
}
