const defaults = {
  trayLength: 1200,
  trayWidth: 1000,
  maxOverhang: 250,
  itemLength: 1320,
  itemWidth: 550,
};

const form = document.getElementById('calculator-form');
const canvas = document.getElementById('layoutCanvas');
const ctx = canvas.getContext('2d');

const recommendedLayoutEl = document.getElementById('recommendedLayout');
const fitStatusEl = document.getElementById('fitStatus');
const xOverhangEl = document.getElementById('xOverhang');
const yOverhangEl = document.getElementById('yOverhang');
const summaryTextEl = document.getElementById('summaryText');

function getInputs() {
  return {
    trayLength: Number(document.getElementById('trayLength').value) || 0,
    trayWidth: Number(document.getElementById('trayWidth').value) || 0,
    maxOverhang: Number(document.getElementById('maxOverhang').value) || 0,
    itemLength: Number(document.getElementById('itemLength').value) || 0,
    itemWidth: Number(document.getElementById('itemWidth').value) || 0,
  };
}

function setDefaults() {
  Object.entries(defaults).forEach(([key, value]) => {
    document.getElementById(key).value = value;
  });
}

function computeScenario(inputs) {
  const { trayLength, trayWidth, maxOverhang, itemLength, itemWidth } = inputs;

  const scenarios = [
    {
      name: '长边方向',
      major: itemLength,
      minor: itemWidth,
    },
    {
      name: '短边方向',
      major: itemWidth,
      minor: itemLength,
    },
  ].map((scenario) => {
    const xOverhang = Math.max(0, (scenario.major - trayLength) / 2);
    const yOverhang = Math.max(0, (scenario.minor - trayWidth) / 2);
    const withinLimit = xOverhang <= maxOverhang && yOverhang <= maxOverhang;
    const totalFit =
      scenario.major <= trayLength + maxOverhang * 2 &&
      scenario.minor <= trayWidth + maxOverhang * 2;

    const score =
      (withinLimit ? 0 : 100000) +
      xOverhang * 10 +
      yOverhang * 10 +
      (totalFit ? 0 : 50000);

    return {
      ...scenario,
      xOverhang,
      yOverhang,
      withinLimit,
      totalFit,
      score,
    };
  });

  scenarios.sort((a, b) => a.score - b.score);
  const best = scenarios[0];

  return {
    best,
    scenarios,
  };
}

function updateSummary(best, inputs) {
  const { trayLength, trayWidth, maxOverhang } = inputs;
  const text = `托盘 ${trayLength}×${trayWidth} mm，允许单边最大超出 ${maxOverhang} mm。` +
    `推荐采用“${best.name}”：` +
    `货物长度方向超出 ${best.xOverhang.toFixed(0)} mm，宽度方向超出 ${best.yOverhang.toFixed(0)} mm。`;

  summaryTextEl.textContent = text;
}

function drawDiagram(best, inputs) {
  const { trayLength, trayWidth } = inputs;
  const maxDim = Math.max(trayLength, trayWidth, best.major, best.minor);
  const scale = 420 / maxDim;
  const padding = 56;

  const trayWidthPx = trayLength * scale;
  const trayHeightPx = trayWidth * scale;
  const itemWidthPx = best.major * scale;
  const itemHeightPx = best.minor * scale;

  const trayX = padding;
  const trayY = 120;

  const itemX = trayX + (trayWidthPx - itemWidthPx) / 2;
  const itemY = trayY + (trayHeightPx - itemHeightPx) / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#f7fafd';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // tray
  ctx.fillStyle = '#dfeeff';
  ctx.strokeStyle = '#2b6eea';
  ctx.lineWidth = 2;
  ctx.fillRect(trayX, trayY, trayWidthPx, trayHeightPx);
  ctx.strokeRect(trayX, trayY, trayWidthPx, trayHeightPx);

  // item
  ctx.fillStyle = '#fde7c8';
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2;
  ctx.fillRect(itemX, itemY, itemWidthPx, itemHeightPx);
  ctx.strokeRect(itemX, itemY, itemWidthPx, itemHeightPx);

  // overhang highlight
  const leftOverhangPx = Math.max(0, (best.major - trayLength) * scale / 2);
  const rightOverhangPx = Math.max(0, (best.major - trayLength) * scale / 2);
  const topOverhangPx = Math.max(0, (best.minor - trayWidth) * scale / 2);
  const bottomOverhangPx = Math.max(0, (best.minor - trayWidth) * scale / 2);

  if (leftOverhangPx > 0) {
    ctx.fillStyle = '#ffd29d';
    ctx.fillRect(itemX - leftOverhangPx, itemY, leftOverhangPx, itemHeightPx);
  }
  if (rightOverhangPx > 0) {
    ctx.fillStyle = '#ffd29d';
    ctx.fillRect(itemX + itemWidthPx, itemY, rightOverhangPx, itemHeightPx);
  }
  if (topOverhangPx > 0) {
    ctx.fillStyle = '#ffd29d';
    ctx.fillRect(itemX, itemY - topOverhangPx, itemWidthPx, topOverhangPx);
  }
  if (bottomOverhangPx > 0) {
    ctx.fillStyle = '#ffd29d';
    ctx.fillRect(itemX, itemY + itemHeightPx, itemWidthPx, bottomOverhangPx);
  }

  // dimension text
  ctx.fillStyle = '#20304b';
  ctx.font = 'bold 14px Microsoft YaHei';
  ctx.textAlign = 'center';
  ctx.fillText(`${trayLength} mm`, trayX + trayWidthPx / 2, trayY - 18);
  ctx.save();
  ctx.translate(trayX - 24, trayY + trayHeightPx / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${trayWidth} mm`, 0, 0);
  ctx.restore();

  ctx.fillStyle = '#d97706';
  ctx.fillText(`${best.major.toFixed(0)} mm`, itemX + itemWidthPx / 2, itemY + itemHeightPx + 22);
  ctx.save();
  ctx.translate(itemX + itemWidthPx + 20, itemY + itemHeightPx / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillText(`${best.minor.toFixed(0)} mm`, 0, 0);
  ctx.restore();

  // overhang notes
  ctx.fillStyle = '#d97706';
  ctx.font = '12px Microsoft YaHei';
  if (leftOverhangPx > 0) {
    ctx.fillText(`左超出 ${best.xOverhang.toFixed(0)} mm`, itemX - leftOverhangPx - 42, itemY + itemHeightPx / 2);
  }
  if (rightOverhangPx > 0) {
    ctx.fillText(`右超出 ${best.xOverhang.toFixed(0)} mm`, itemX + itemWidthPx + 12, itemY + itemHeightPx / 2);
  }
  if (topOverhangPx > 0) {
    ctx.fillText(`上超出 ${best.yOverhang.toFixed(0)} mm`, itemX + itemWidthPx / 2, itemY - topOverhangPx - 8);
  }
  if (bottomOverhangPx > 0) {
    ctx.fillText(`下超出 ${best.yOverhang.toFixed(0)} mm`, itemX + itemWidthPx / 2, itemY + itemHeightPx + bottomOverhangPx + 20);
  }
}

function render() {
  const inputs = getInputs();
  const { best, scenarios } = computeScenario(inputs);

  recommendedLayoutEl.textContent = best.name;
  fitStatusEl.textContent = best.withinLimit ? '满足' : '超限';
  fitStatusEl.style.color = best.withinLimit ? '#16a34a' : '#dc2626';
  xOverhangEl.textContent = `${best.xOverhang.toFixed(0)} mm`;
  yOverhangEl.textContent = `${best.yOverhang.toFixed(0)} mm`;

  const validIteration = scenarios.filter((item) => item.withinLimit).length;
  updateSummary(best, inputs);
  drawDiagram(best, inputs);

  if (best.withinLimit) {
    summaryTextEl.textContent += ` 可行方案数量：${validIteration}。`;
  } else {
    summaryTextEl.textContent += ` 当前配置不满足“单边最大超出 ${inputs.maxOverhang} mm”的限制，建议缩小货物尺寸或增大托盘尺寸。`;
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  render();
});

document.getElementById('resetBtn').addEventListener('click', () => {
  setDefaults();
  render();
});

setDefaults();
render();
