/**
 * Pure crusher-selection logic shared by the web demo and Chrome extension.
 *
 * The input and dataset are plain objects/arrays. This module does not touch
 * the DOM, network, storage or customer data.
 */

const PROFILES = {
  granite: { solution: 'hard-rock', line: 'line_jaw_cone' },
  basalt: { solution: 'hard-rock', line: 'line_jaw_cone' },
  'river-pebble': { solution: 'hard-rock', line: 'line_jaw_cone' },
  'iron-ore': { solution: 'hard-rock', line: 'line_jaw_cone' },
  'other-hard': { solution: 'hard-rock', line: 'line_jaw_cone' },
  limestone: { solution: 'soft-rock', line: 'line_impact' },
  'cd-waste': { solution: 'soft-rock', line: 'line_impact' },
  'other-soft': { solution: 'soft-rock', line: 'line_impact' },
};

const SCREEN_PRIORITY_TRACKED = ['SS-7018', 'SSP-6200', 'SZ-450D'];
const SCREEN_PRIORITY_MODULAR = ['SS-J7018'];

function num(value, fallback) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function mobilityMatch(model, preference) {
  if (!preference || preference === 'either') return true;
  return model.mobility === preference;
}

function capacityDistance(model, target) {
  const min = num(model.capMin, 0);
  const max = num(model.capMax, min);
  if (target >= min && target <= max) return 0;
  return target < min ? min - target : target - max;
}

function chooseModel(models, category, target, feed, mobility, primary) {
  let candidates = models.filter((model) => {
    if (category === 'vsi') return model.isVsi;
    if (category === 'impact-crusher') return model.category === category && !model.isVsi;
    return model.category === category;
  });

  const preferred = candidates.filter((model) => mobilityMatch(model, mobility));
  if (preferred.length) candidates = preferred;
  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    let scoreA = capacityDistance(a, target) * 10;
    let scoreB = capacityDistance(b, target) * 10;

    if (primary) {
      const feedA = num(a.feedMax, 0);
      const feedB = num(b.feedMax, 0);
      if (feedA < feed) scoreA += (feed - feedA) * 20;
      if (feedB < feed) scoreB += (feed - feedB) * 20;
    }
    return scoreA - scoreB;
  });

  return candidates[0];
}

/*
 * Screens are capacity-led: the published lower limit is treated as zero for
 * selection. The explicit order prevents a generic "closest capacity" sort from
 * always choosing the heavy-duty SZ-450D at 200 t/h.
 */
function chooseScreen(models, target, mobility) {
  let candidates = models.filter((model) => model.category === 'screening-plant');
  const preferred = candidates.filter((model) => mobilityMatch(model, mobility));
  if (preferred.length) candidates = preferred;

  const eligible = candidates.filter((model) => target <= num(model.capMax, 0));
  if (!eligible.length) return null;

  const priority = mobility === 'modular' ? SCREEN_PRIORITY_MODULAR : SCREEN_PRIORITY_TRACKED;
  const rank = (model) => {
    const index = priority.indexOf(model.code);
    return index === -1 ? priority.length : index;
  };

  eligible.sort((a, b) => {
    const diff = rank(a) - rank(b);
    return diff !== 0 ? diff : num(a.capMax, 0) - num(b.capMax, 0);
  });
  return eligible[0];
}

function matchingCases(cases, selected) {
  const codes = selected.map((model) => model.code);
  const exact = cases.filter((project) =>
    (project.equipment || []).some((code) => codes.includes(code))
  );
  return (exact.length ? exact : cases).slice(0, 2);
}

export function selectCrusher(input, dataset) {
  const models = Array.isArray(dataset?.models) ? dataset.models : [];
  const cases = Array.isArray(dataset?.cases) ? dataset.cases : [];
  const values = {
    material: input?.material || 'other-soft',
    maxFeed: num(input?.maxFeed, 0),
    target: num(input?.targetTph, 0),
    product: input?.product || 'unsure',
    mobility: input?.mobility || 'either',
  };

  const profile = PROFILES[values.material] || PROFILES['other-soft'];
  const selected = [];
  const hard = profile.solution === 'hard-rock';
  const wantsSand = values.product === 'sand';
  const largeFeed = values.maxFeed > 600;
  let lineKey = profile.line;
  let screenMissing = false;

  if (hard) {
    const jaw = chooseModel(models, 'jaw-crusher', values.target, values.maxFeed, values.mobility, true);
    if (jaw) selected.push(jaw);

    const cone = chooseModel(models, 'cone-crusher', values.target, values.maxFeed, values.mobility, false);
    if (cone) selected.push(cone);

    if (wantsSand) {
      const sand = chooseModel(models, 'vsi', values.target, values.maxFeed, values.mobility, false);
      if (sand) selected.push(sand);
      const screen = chooseScreen(models, values.target, values.mobility);
      if (screen) selected.push(screen);
      else screenMissing = true;
      lineKey = 'line_vsi';
    } else {
      const screen = chooseScreen(models, values.target, values.mobility);
      if (screen) selected.push(screen);
      else screenMissing = true;
      lineKey = 'line_jaw_cone';
    }
  } else {
    if (largeFeed) {
      const jaw = chooseModel(models, 'jaw-crusher', values.target, values.maxFeed, values.mobility, true);
      if (jaw) selected.push(jaw);
      lineKey = 'line_jaw_impact';
    }

    if (!wantsSand) {
      const impact = chooseModel(models, 'impact-crusher', values.target, values.maxFeed, values.mobility, !largeFeed);
      if (impact) selected.push(impact);
    }

    if (wantsSand) {
      const vsi = chooseModel(models, 'vsi', values.target, values.maxFeed, values.mobility, false);
      if (vsi) selected.push(vsi);
      lineKey = 'line_vsi';
    } else if (!largeFeed) {
      lineKey = 'line_impact';
    }

    const screen = chooseScreen(models, values.target, values.mobility);
    if (screen) selected.push(screen);
    else screenMissing = true;
  }

  const seen = new Set();
  const unique = selected.filter((model) => {
    if (!model || seen.has(model.code)) return false;
    seen.add(model.code);
    return true;
  }).slice(0, 4);

  if (screenMissing) lineKey = 'line_engineer';

  return {
    input: values,
    lineKey,
    solutionKey: profile.solution,
    screenMissing,
    models: unique,
    cases: matchingCases(cases, unique),
  };
}

export const SELECTION_META = {
  materials: [
    'granite',
    'basalt',
    'river-pebble',
    'iron-ore',
    'limestone',
    'cd-waste',
    'other-hard',
    'other-soft',
  ],
  profiles: PROFILES,
  screenPriority: {
    tracked: SCREEN_PRIORITY_TRACKED,
    modular: SCREEN_PRIORITY_MODULAR,
  },
};
