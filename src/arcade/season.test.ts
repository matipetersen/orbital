import { describe, expect, it } from 'vitest';
import { newMeta } from './meta';
import { Mission } from './mission';
import {
  DECISIONS,
  LAPS,
  POINTS,
  ROUNDS,
  applyRace,
  buySeasonUpgrade,
  decide,
  newSeason,
  raceTune,
  roster,
  seasonRace,
  standings,
} from './season';

const never = (): number => 0.99;
const always = (): number => 0;

describe('championship season', () => {
  it('starts with ten teams of two, the player in Orbital Racing, and eight rounds', () => {
    const s = newSeason(1);
    expect(s.teams).toHaveLength(10);
    expect(s.drivers).toHaveLength(20);
    for (let t = 0; t < 10; t++) expect(s.drivers.filter((d) => d.team === t)).toHaveLength(2);
    expect(s.drivers.filter((d) => d.player)).toEqual([expect.objectContaining({ team: 0 })]);
    expect(s.rounds).toHaveLength(ROUNDS);
    expect(new Set(s.drivers.map((d) => d.name)).size).toBe(20);
  });

  it('builds a twenty-ship, three-lap Grand Prix with a chequered flag and the named field', () => {
    const s = newSeason(2);
    const st = seasonRace(s).stages[0];
    expect(st.field!.laps).toBe(LAPS);
    expect(st.field!.slots).toHaveLength(19);
    expect(st.field!.closing).toBeGreaterThan(0);
    expect(st.field!.roster!.map((r) => r.name)).toEqual(roster(s).map((r) => s.drivers[r.driver].name));
  });

  it('scores a race like Formula 1 and pays the team', () => {
    const s = newSeason(3);
    const order = s.drivers.map((_, i) => i).reverse();
    const player = s.drivers.findIndex((d) => d.player);
    const credits = s.credits;
    const out = applyRace(s, order, [], never);
    expect(s.drivers[order[0]].points).toBe(25);
    expect(s.drivers[order[9]].points).toBe(1);
    expect(s.drivers[order[10]].points).toBe(0);
    expect(s.drivers[order[0]].wins).toBe(1);
    expect(s.teams.reduce((a, t) => a + t.points, 0)).toBe(POINTS.reduce((a, b) => a + b, 0));
    expect(out.playerPlace).toBe(order.indexOf(player) + 1);
    expect(s.credits).toBe(credits + out.credits);
    expect(s.round).toBe(1);
    expect(s.event).not.toBeNull();
  });

  it('gives no points to a retirement and ends after the last round', () => {
    const s = newSeason(4);
    const player = s.drivers.findIndex((d) => d.player);
    for (let r = 0; r < ROUNDS; r++) {
      s.event = null;
      const order = [player, ...s.drivers.map((_, i) => i).filter((i) => i !== player)];
      const out = applyRace(s, order, [player], never);
      expect(out.playerPlace).toBeNull();
    }
    expect(s.drivers[player].points).toBe(0);
    expect(s.done).toBe(true);
    expect(standings(s)[0]).not.toBe(player);
  });

  it('decisions change the season: the risky part can disqualify, the sponsor pays only on target', () => {
    const s = newSeason(5);
    const player = s.drivers.findIndex((d) => d.player);
    const winFirst = [player, ...s.drivers.map((_, i) => i).filter((i) => i !== player)];
    s.event = 'trampa';
    expect(decide(s, 0)).not.toBeNull();
    expect(raceTune(s).thrust).toBeGreaterThan(1);
    const out = applyRace(s, winFirst, [], always);
    expect(out.disqualified).toBe(true);
    expect(s.drivers[player].points).toBe(0);

    s.event = 'patrocinador';
    decide(s, 1);
    const before = s.credits;
    const out2 = applyRace(s, winFirst, [], never);
    expect(out2.bonus).toBe(450);
    expect(s.credits).toBe(before + out2.credits);
    expect(s.drivers[player].points).toBe(25);
  });

  it('refuses a choice the team cannot pay for, and every card has two options', () => {
    const s = newSeason(6);
    s.credits = 10;
    s.event = 'ingeniero';
    expect(decide(s, 0)).toBeNull();
    expect(s.event).toBe('ingeniero');
    for (const d of DECISIONS) expect(d.choices.length).toBeGreaterThanOrEqual(2);
  });

  it('upgrades bought with credits last the season and respect the slots', () => {
    const s = newSeason(7);
    s.credits = 5000;
    expect(buySeasonUpgrade(s, 'motor')).toBe(true);
    expect(buySeasonUpgrade(s, 'tank')).toBe(true);
    expect(buySeasonUpgrade(s, 'hull')).toBe(true);
    expect(buySeasonUpgrade(s, 'turn')).toBe(false);
    expect(s.upgrades.motor).toBe(1);
  });

  it('a championship race flies the season ship, classifies all twenty and pays no arcade data', () => {
    const s = newSeason(8);
    s.engine = 'potencia';
    const meta = newMeta();
    meta.data = 77;
    const m = new Mission(meta, { race: seasonRace(s), loadout: { upgrades: s.upgrades, tune: raceTune(s) } });
    expect(m.rivals).toHaveLength(19);
    expect(m.player.stats.thrust).toBeCloseTo(150 * raceTune(s).thrust, 5);
    expect(m.player.route).toHaveLength(LAPS * m.arena.gates.length + 1);
    for (let i = 0; i < 600; i++) m.update(1 / 60, { throttle: 0, turn: 0 });
    m.retire();
    expect(m.result!.order).toHaveLength(20);
    expect(m.result!.dnf).toEqual([m.player.id]);
    expect(m.result!.order!.at(-1)).toBe(m.player.id);
    expect(meta.data).toBe(77);
  });
});
