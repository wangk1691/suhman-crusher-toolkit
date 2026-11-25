import { selectCrusher } from './lib/selection.js';

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const lines = {
  line_jaw_cone: 'a jaw primary, a cone and a screen',
  line_jaw_impact: 'a jaw primary, an impact crusher and a screen',
  line_impact: 'an impact crusher and a screen',
  line_vsi: 'a primary crusher, a VSI and a screen',
  line_engineer: 'a configuration confirmed by an engineer',
};

let dataset = null;
fetch('./lib/dataset.json')
  .then((r) => r.json())
  .then((data) => { dataset = data; })
  .catch(() => {
    $('result').innerHTML = '<h2>Data unavailable</h2><p>Please use the full calculator on the SUHMAN website.</p>';
  });

$('tool-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!dataset) return;

  const material = $('material').value;
  const feed = Number($('feed').value);
  const tph = Number($('tph').value);
  if (!(feed >= 50 && feed <= 1500) || !(tph >= 20 && tph <= 1000)) {
    $('result').innerHTML = '<h2>Check the input</h2><p>Use feed 50–1,500 mm and capacity 20–1,000 t/h.</p>';
    return;
  }

  const result = selectCrusher({
    material,
    maxFeed: feed,
    targetTph: tph,
    product: $('product').value,
    mobility: $('mobility').value,
  }, dataset);

  const materialLabel = $('material').selectedOptions[0].textContent;
  const models = result.models.map((model) => `
    <a class="model" href="${esc(dataset.site + model.url + '?utm_source=chrome_web_store&utm_medium=extension&utm_campaign=crusher_calculator')}" target="_blank" rel="noopener">
      <small>${esc(model.code)}</small>
      <strong>${esc(model.name)}</strong>
      <small>${esc(model.cap)} · max feed ${esc(model.feed)}</small>
    </a>`).join('');

  const cases = result.cases.map((project) => `
    <a class="model" href="${esc(dataset.site + project.url + '?utm_source=chrome_web_store&utm_medium=extension&utm_campaign=crusher_calculator')}" target="_blank" rel="noopener">
      <small>${esc(project.industry)} · ${esc(project.location)}</small>
      <strong>${esc(project.title)}</strong>
    </a>`).join('');

  $('result').innerHTML = `
    <h2>Recommended starting point</h2>
    <p>For ${esc(materialLabel)} at about ${tph} t/h, start with ${esc(lines[result.lineKey] || lines.line_engineer)}.</p>
    ${result.screenMissing ? '<p class="warn">No standard screening model covers this target capacity. An engineer will confirm a custom configuration.</p>' : ''}
    ${models}
    ${cases ? `<p><strong>Similar projects</strong></p>${cases}` : ''}
    <p>Planning estimate only. Confirm the final configuration with an engineer.</p>`;
});
