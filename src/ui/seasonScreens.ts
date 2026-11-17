import { type ArcadeController } from '../arcade/controller';
import { UPGRADES, UPGRADE_SLOTS, type Upgrades, usedSlots } from '../arcade/meta';
import {
  CLOSING,
  DIFFICULTY,
  ENGINE_MAPS,
  type EngineMap,
  HULL_SETUPS,
  type HullSetup,
  LAPS,
  POINTS,
  ROUNDS,
  type Season,
  TRAITS,
  decisionById,
  pointsFor,
  raceTune,
  seasonRace,
  standings,
  teamStandings,
  upgradeCost,
} from '../arcade/season';
import { h } from './dom';

function btn(label: string, onclick: () => void, cls = '', disabled = false): HTMLButtonElement {
  return h('button', { class: `btn ${cls}`, onclick, disabled }, label);
}
const kv = (k: string, v: string, cls = ''): HTMLElement => h('div', {}, h('span', { class: 'k' }, `${k} `), h('span', { class: `v ${cls}` }, v));
const pct = (x: number): string => `${x >= 1 ? '+' : ''}${Math.round((x - 1) * 100)} %`;
const place = (n: number | null | undefined): string => (n ? `${n}º` : 'DNF');

/** Drivers' table: top ten and the player's own row if lower. */
function driverTable(s: Season, limit = 10): HTMLElement {
  const order = standings(s);
  const rows = order.slice(0, limit);
  const me = order.findIndex((i) => s.drivers[i].player);
  if (me >= limit) rows.push(order[me]);
  return h('div', { class: 'panel' },
    ...rows.map((i) => {
      const d = s.drivers[i];
      const pos = order.indexOf(i) + 1;
      return h('div', { class: 'row', style: 'justify-content:space-between' },
        h('span', { class: d.player ? 'good' : 'v' }, `${pos}. ${d.name}`),
        h('span', { class: 'k', style: `color:${s.teams[d.team].color}` }, s.teams[d.team].name),
        h('span', { class: 'amber' }, `${d.points} pts${d.wins ? ` · ${d.wins} V` : ''}`),
      );
    }),
  );
}

function teamTable(s: Season): HTMLElement {
  return h('div', { class: 'panel' },
    ...teamStandings(s).map((t, k) => h('div', { class: 'row', style: 'justify-content:space-between' },
      h('span', { class: t === 0 ? 'good' : 'v', style: `color:${s.teams[t].color}` }, `${k + 1}. ${s.teams[t].name}`),
      h('span', { class: 'amber' }, `${s.teams[t].points} pts`),
    )),
  );
}

function calendar(s: Season): HTMLElement {
  return h('div', { class: 'grid' },
    ...s.rounds.map((r, i) => h('div', { class: 'panel', style: i === s.round ? 'border-color:var(--amber)' : '' },
      h('div', { class: i === s.round ? 'amber' : 'k' }, `Ronda ${i + 1}${r.name ? ` · ${r.name}` : ''}`),
      h('div', { class: 'k' }, TRAITS[r.trait].name),
      r.order ? h('div', { class: r.playerPlace && r.playerPlace <= 10 ? 'good' : 'bad' }, `Tu resultado: ${place(r.playerPlace)}${r.playerPlace ? ` (+${pointsFor(r.playerPlace)} pts)` : ''}`) : null,
    )),
  );
}

function setupPicker(c: ArcadeController, s: Season): HTMLElement[] {
  const tune = raceTune(s);
  return [
    h('h2', {}, 'CONFIGURACIÓN PARA ESTA CARRERA'),
    h('p', { class: 'sub' }, 'Mapa de motor'),
    h('div', { class: 'row' }, ...(Object.keys(ENGINE_MAPS) as EngineMap[]).map((k) => btn(ENGINE_MAPS[k].name, () => c.seasonSetup(k, null), s.engine === k ? 'on' : ''))),
    h('p', { class: 'k' }, ENGINE_MAPS[s.engine].desc),
    h('p', { class: 'sub' }, 'Casco'),
    h('div', { class: 'row' }, ...(Object.keys(HULL_SETUPS) as HullSetup[]).map((k) => btn(HULL_SETUPS[k].name, () => c.seasonSetup(null, k), s.hullSetup === k ? 'on' : ''))),
    h('p', { class: 'k' }, HULL_SETUPS[s.hullSetup].desc),
    h('div', { class: 'panel grid' },
      kv('Empuje', pct(tune.thrust), tune.thrust >= 1 ? 'good' : 'bad'),
      kv('Combustible', pct(tune.fuel), tune.fuel >= 1 ? 'good' : 'bad'),
      kv('Casco', pct(tune.hull), tune.hull >= 1 ? 'good' : 'bad'),
      kv('Giro', pct(tune.turn), tune.turn >= 1 ? 'good' : 'bad'),
    ),
    h('p', { class: 'sub' }, `Incluye el desarrollo de la escudería y las decisiones pendientes. El combustible no alcanza para ${LAPS} vueltas a fondo: podés parar en boxes aterrizando en tu plataforma, que recarga combustible y casco.`),
  ];
}

function shop(c: ArcadeController, s: Season): HTMLElement[] {
  const used = usedSlots(s.upgrades);
  return [
    h('h2', {}, 'DESARROLLO'),
    h('p', { class: 'sub' }, `Créditos: ${s.credits}. Las mejoras duran toda la temporada. Ranuras: ${used}/${UPGRADE_SLOTS}.`),
    ...UPGRADES.map((u) => {
      const level = s.upgrades[u.id];
      const cost = upgradeCost(s, u.id as keyof Upgrades);
      const maxed = level >= u.max;
      return h('div', { class: 'panel' },
        h('div', { class: 'row' },
          h('span', { class: maxed ? 'good' : 'v' }, `${u.name} ${'■'.repeat(level)}${'□'.repeat(u.max - level)}`),
          h('span', { class: 'k' }, u.desc),
          btn(maxed ? 'AL MÁXIMO' : cost === null ? 'SIN RANURA' : `${cost} CR`, () => c.seasonBuy(u.id), 'go', cost === null || s.credits < cost),
        ),
      );
    }),
  ];
}

export const seasonScreens = {
  /** Before a season: what it is and how hard. */
  start(c: ArcadeController): HTMLElement {
    const s = c.season;
    return h('div', { class: 'screen' },
      h('h1', {}, 'CAMPEONATO ORBITAL'),
      h('p', { class: 'sub' }, 'Una temporada de Grandes Premios al estilo Fórmula 1, en el espacio.'),
      h('div', { class: 'panel' },
        h('ul', { class: 'tight' },
          h('li', {}, `${ROUNDS} Grandes Premios, ${LAPS} vueltas cada uno, con 20 naves: diez escuderías de dos pilotos. La tuya es Orbital Racing.`),
          h('li', {}, `Puntos para los diez primeros: ${POINTS.join(', ')}. Gana el campeonato quien más sume.`),
          h('li', {}, `Cuando el ganador aterriza, tenés ${CLOSING} s para llegar: después se baja la bandera a cuadros.`),
          h('li', {}, 'Entre carreras decidís: configuración de la nave, mejoras con los créditos del equipo y decisiones de la escudería que cambian la temporada.'),
          h('li', {}, 'Las escuderías rivales también desarrollan sus naves. Si te quedás quieto, te pasan.'),
        ),
      ),
      h('h2', {}, 'DIFICULTAD DE LA GRILLA'),
      h('div', { class: 'row' }, ...DIFFICULTY.map((d, i) => btn(d.name, () => c.newSeason(i), i === 1 ? 'go' : ''))),
      s ? h('p', { class: 'bad' }, 'Empezar una temporada nueva borra la que está en curso.') : null,
      h('div', { class: 'row', style: 'margin-top:14px' },
        s ? btn('VOLVER A LA TEMPORADA', () => c.openSeason(), 'go') : null,
        btn('VOLVER AL INICIO', () => c.exit()),
      ),
    );
  },

  /** The garage between races: the decision, the setup, the shop and the tables. */
  hub(c: ArcadeController): HTMLElement {
    const s = c.season!;
    if (s.done) return seasonScreens.final(c);
    const info = s.rounds[s.round];
    const race = seasonRace(s);
    info.name = race.stages[0].name;
    const card = decisionById(s.event);
    const me = standings(s).findIndex((i) => s.drivers[i].player) + 1;
    return h('div', { class: 'screen' },
      h('h1', {}, `RONDA ${s.round + 1} DE ${ROUNDS}`),
      h('p', { class: 'sub' }, `Orbital Racing · ${s.round === 0 ? 'temporada por empezar' : `${me}º en el campeonato con ${s.drivers.find((d) => d.player)!.points} pts`} · ${s.credits} créditos · grilla ${DIFFICULTY[s.difficulty ?? 1].name}`),
      ...s.news.map((n) => h('p', { class: 'amber' }, n)),
      card
        ? h('div', { class: 'panel', style: 'border-color:var(--amber)' },
            h('h2', {}, card.title),
            h('p', {}, card.text(s)),
            ...card.choices.map((ch, i) => h('div', { class: 'row', style: 'margin:6px 0' },
              btn(ch.label, () => c.seasonDecide(i), 'warn', !!ch.cost && s.credits < ch.cost),
              h('span', { class: 'k' }, ch.desc + (ch.cost && s.credits < ch.cost ? ' (no alcanzan los créditos)' : '')),
            )),
          )
        : null,
      h('div', { class: 'panel' },
        h('h2', {}, info.name.toUpperCase()),
        kv('Circuito', TRAITS[info.trait].name, info.trait === 'clasico' ? '' : 'amber'),
        h('p', { class: 'k' }, TRAITS[info.trait].desc),
        kv('Vueltas', String(LAPS)),
        kv('Naves', String(s.drivers.length)),
        h('div', { class: 'row', style: 'margin-top:8px' },
          btn(card ? 'PRIMERO DECIDÍ ARRIBA' : 'A LA GRILLA', () => c.startSeasonRace(), 'go', !!card),
          btn('SALIR', () => c.exit()),
        ),
      ),
      ...setupPicker(c, s),
      ...shop(c, s),
      h('h2', {}, 'CAMPEONATO DE PILOTOS'),
      driverTable(s),
      h('h2', {}, 'CAMPEONATO DE CONSTRUCTORES'),
      teamTable(s),
      h('h2', {}, 'CALENDARIO'),
      calendar(s),
      h('div', { class: 'row', style: 'margin-top:14px' },
        btn('CÓMO SE JUEGA', () => c.openHelp(() => c.openSeason())),
        btn('NUEVA TEMPORADA', () => c.openSeasonStart(), 'bad'),
      ),
    );
  },

  /** After a Grand Prix: the classification and what it paid. */
  result(c: ArcadeController): HTMLElement {
    const s = c.season!;
    const o = c.lastOutcome!;
    const roundIdx = s.round - 1;
    const info = s.rounds[roundIdx];
    const classified = o.order.filter((d) => !o.dnf.includes(d));
    const title = o.disqualified ? 'DESCALIFICADO' : o.playerPlace ? (o.playerPlace === 1 ? '¡VICTORIA!' : `TERMINASTE ${o.playerPlace}º`) : 'NO TERMINASTE';
    const good = !!o.playerPlace && o.playerPlace <= 10 && !o.disqualified;
    return h('div', { class: 'screen' },
      h('p', { class: 'sub' }, `Ronda ${roundIdx + 1} de ${ROUNDS} · ${info.name ?? ''}`),
      h('h1', { class: good ? 'good' : 'bad' }, title),
      ...o.lines.map((l) => h('p', { class: 'amber' }, l)),
      h('div', { class: 'panel' },
        kv('Puntos', o.playerPlace ? `+${pointsFor(o.playerPlace)}` : '0', good ? 'good' : 'bad'),
        kv('Créditos del equipo', `+${o.credits}`, 'amber'),
        kv('Créditos disponibles', String(s.credits)),
      ),
      h('div', { class: 'row' }, btn(s.done ? 'VER EL CAMPEONATO' : 'VOLVER AL BOX', () => c.openSeason(), 'go')),
      h('h2', {}, 'CLASIFICACIÓN'),
      h('div', { class: 'panel' },
        ...o.order.map((d) => {
          const drv = s.drivers[d];
          const pos = classified.indexOf(d);
          return h('div', { class: 'row', style: 'justify-content:space-between' },
            h('span', { class: drv.player ? 'good' : 'v' }, `${pos >= 0 ? pos + 1 : '—'}. ${drv.name}`),
            h('span', { class: 'k', style: `color:${s.teams[drv.team].color}` }, s.teams[drv.team].name),
            h('span', { class: 'amber' }, pos >= 0 ? (pointsFor(pos + 1) ? `+${pointsFor(pos + 1)}` : '') : 'DNF'),
          );
        }),
      ),
      h('h2', {}, 'CAMPEONATO'),
      driverTable(s),
    );
  },

  /** End of the season. */
  final(c: ArcadeController): HTMLElement {
    const s = c.season!;
    const order = standings(s);
    const champ = s.drivers[order[0]];
    const me = order.findIndex((i) => s.drivers[i].player) + 1;
    const teams = teamStandings(s);
    return h('div', { class: 'screen' },
      h('h1', { class: champ.player ? 'good' : 'amber' }, champ.player ? '¡CAMPEÓN DEL MUNDO!' : 'FIN DE LA TEMPORADA'),
      h('p', { class: 'sub' }, champ.player
        ? `Ganaste el campeonato con ${champ.points} puntos.`
        : `${champ.name} (${s.teams[champ.team].name}) es campeón con ${champ.points} puntos. Terminaste ${me}º.`),
      h('p', { class: 'sub' }, `Constructores: ${s.teams[teams[0]].name} campeón; Orbital Racing ${teams.indexOf(0) + 1}º.`),
      h('div', { class: 'row' },
        btn('NUEVA TEMPORADA', () => c.openSeasonStart(), 'go'),
        btn('SALIR', () => c.exit()),
      ),
      h('h2', {}, 'PILOTOS'),
      driverTable(s, 20),
      h('h2', {}, 'CONSTRUCTORES'),
      teamTable(s),
      h('h2', {}, 'TUS CARRERAS'),
      calendar(s),
    );
  },
};
