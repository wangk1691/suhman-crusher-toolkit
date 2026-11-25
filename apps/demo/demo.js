import { selectCrusher } from '../../src/core/selection.js';

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const lines = {
  line_jaw_cone: 'a jaw primary followed by a cone and a screen',
  line_jaw_impact: 'a jaw primary followed by an impact crusher and a screen',
  line_impact: 'an impact crusher followed by a screen',
  line_vsi: 'a primary crusher, a VSI and a screen',
  line_engineer: 'a configuration confirmed by an engineer',
};

let dataset = null;

fetch('../../src/data/dataset.json')
  .then((r) => r.json())
  .then((data) => { dataset = data; })
  .catch(() => {
    $('result').innerHTML = '<h2>Dataset not loaded</h2><p>Open the full tool on the SUHMAN website.</p>';
  });

$('run').addEventListener('click', () => {
  if (!dataset) return;
  const result = selectCrusher({
    material: $('material').value,
    maxFeed: Number($('feed').value),
    targetTph: Number($('tph').value),
    product: $('product').value,
    mobility: $('mobility').value,
  }, dataset);

  const materialLabel = $('material').selectedOptions[0].textContent;
  const summary = `For ${materialLabel} at about ${result.input.target} t/h, start with ${lines[result.lineKey] || 'a configuration confirmed by an engineer'}.`;
  const models = result.models.map((model) => `
    <a class="model" href="${esc(dataset.site + model.url)}" target="_blank" rel="noopener">
      <small>${esc(model.code)}</small>
      <strong>${esc(model.name)}</strong>
      <small>Capacity: ${esc(model.cap)}</small>
      <small>Max feed: ${esc(model.feed)}</small>
    </a>`).join('');

  const cases = result.cases.map((project) => `
    <a class="model" href="${esc(dataset.site + project.url)}" target="_blank" rel="noopener">
      <small>${esc(project.industry)} · ${esc(project.location)}</small>
      <strong>${esc(project.title)}</strong>
    </a>`).join('');

  $('result').innerHTML = `
    <h2>Recommended starting point</h2>
    <p>${esc(summary)}</p>
    ${result.screenMissing ? '<p class="danger">No standard screening model covers this target capacity. An engineer will confirm a custom screen configuration.</p>' : ''}
    <div class="models">${models}</div>
    ${cases ? `<h2 style="margin-top:24px">Similar projects</h2><div class="models">${cases}</div>` : ''}
    <p class="muted" style="margin-top:20px">Capacity depends on gradation, moisture, feed distribution and the final product. Confirm the configuration with an engineer before ordering.</p>
    <p><a class="model" style="display:inline-block" href="${esc(dataset.site)}/contact#quote" target="_blank" rel="noopener">Send project details →</a></p>`;
});
