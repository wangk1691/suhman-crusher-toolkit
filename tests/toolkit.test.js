import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { selectCrusher } from '../src/core/selection.js';
import { checkFeedOpening } from '../src/core/feed-opening.js';
import { estimateScreenArea } from '../src/core/screen-area.js';

const dataset = JSON.parse(await readFile(new URL('../src/data/dataset.json', import.meta.url), 'utf8'));

test('200 t/h granite uses the tracked screening priority', () => {
  const result = selectCrusher({ material: 'granite', maxFeed: 700, targetTph: 200, mobility: 'tracked' }, dataset);
  assert.deepEqual(result.models.map((m) => m.code), ['SE-1060', 'SY-HP300', 'SS-7018']);
  assert.equal(result.screenMissing, false);
});

test('350 t/h moves to SSP-6200 when SS-7018 max capacity is exceeded', () => {
  const result = selectCrusher({ material: 'granite', maxFeed: 700, targetTph: 350, mobility: 'tracked' }, dataset);
  assert.ok(result.models.some((m) => m.code === 'SSP-6200'));
  assert.ok(!result.models.some((m) => m.code === 'SS-7018'));
});

test('450 t/h moves to SZ-450D', () => {
  const result = selectCrusher({ material: 'granite', maxFeed: 700, targetTph: 450, mobility: 'tracked' }, dataset);
  assert.ok(result.models.some((m) => m.code === 'SZ-450D'));
});

test('above 500 t/h does not force a standard screen', () => {
  const result = selectCrusher({ material: 'granite', maxFeed: 700, targetTph: 501, mobility: 'tracked' }, dataset);
  assert.equal(result.screenMissing, true);
  assert.equal(result.lineKey, 'line_engineer');
  assert.ok(!result.models.some((m) => m.isScreen));
});

test('modular selection uses SS-J7018 first', () => {
  const result = selectCrusher({ material: 'granite', maxFeed: 700, targetTph: 200, mobility: 'modular' }, dataset);
  assert.ok(result.models.some((m) => m.code === 'SS-J7018'));
  assert.ok(!result.models.some((m) => m.code === 'SZ-450D'));
});

test('feed opening checker applies the shape margin', () => {
  assert.equal(checkFeedOpening({ opening: 700, lump: 500, shape: 'cubical' }).verdict, 'good');
  assert.equal(checkFeedOpening({ opening: 700, lump: 580, shape: 'slabby' }).verdict, 'fail');
});

test('screen area estimate is deterministic', () => {
  const result = estimateScreenArea({ tph: 200, density: 1.6, aperture: 20, decks: 2, moisture: 'dry', efficiency: 90 });
  assert.equal(result.areaPerDeck.toFixed(1), '12.0');
  assert.equal(result.totalArea.toFixed(1), '24.0');
});
