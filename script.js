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

function computeSingleRowScenario(inputs) {
  const { trayLength, trayWidth, maxOverhang, itemLength, itemWidth } = inputs;

  const scenarios = [
    {
      name: '长边方向',
      itemLength,
      itemWidth,
      rows: 1,
      cols: 1,
      type: '单排',
    },
    {
      name: '短边方向',
      itemLength: itemWidth,
      itemWidth: itemLength,
      rows: 1,
      cols: 1,
      type: '单排',
    },
  ].map((scenario) => {
    const majorLength = Math.max(scenario.itemLength, scenario.itemWidth);
    const minorLength = Math.min(scenario.itemLength, scenario.itemWidth);
    const xOverhang = Math.max(0, (majorLength - trayLength) / 2);
    const yOverhang = Math.max(0, (minorLength - trayWidth) / 2);
    const withinLimit = xOverhang <= maxOverhang && yOverhang <= maxOverhang;

    return {
      ...scenario,
      xOverhang,
      yOverhang,
      withinLimit,
      totalLength: majorLength,
      totalWidth: minorLength,
      score: (withinLimit ? 0 : 100000) + xOverhang * 10 + yOverhang * 10,
    };
  });

  return scenarios;
}

function computeMultiRowScenario(inputs) {
  const { trayLength, trayWidth, maxOverhang, itemLength, itemWidth } = inputs;

  const baseOptions = [
    {
      name: '长边×2排',
      itemLength,
      itemWidth,
      rows: 2,
      cols: 1,
      type: '多排',
    },
    {
      name: '短边×2排',
      itemLength: itemWidth,
      itemWidth: itemLength,
      rows: 2,
      cols: 1,
      type: '多排',
    },
  ];

  return baseOptions.map((scenario) => {
    const totalLength = scenario.itemLength;
    const totalWidth = scenario.itemWidth * scenario.rows;
    const xOverhang = Math.max(0, (totalLength - trayLength) / 2);
    const yOverhang = Math.max(0, (totalWidth - trayWidth) / 2);
    const withinLimit = xOverhang <= maxOverhang && yOverhang <= maxOverhang;

    return {
      ...scenario,
      totalLength,
      totalWidth,
      xOverhang,
      yOverhang,
      withinLimit,
      score: (withinLimit ? 0 : 100000) + xOverhang * 10 + yOverhang * 10,
    };
  });
}

function computeScenario(inputs) {
  const singleRowScenarios = computeSingleRowScenario(inputs);
  const multiRowScenarios = computeMultiRowScenario(inputs);
  const allScenarios = [...singleRowScenarios, ...multiRowScenarios];

  allScenarios.sort((a, b) => a.score - b.score);
  const best = allScenarios[0];

  return { best, scenarios: allScenarios };
}

function updateSummary(best, inputs) {
  const { trayLength, trayWidth, maxOverhang } = inputs;
  let text = `托盘 ${trayLength}×${trayWidth} mm，允许单边最大超出 ${maxOverhang} mm。` +
    `推荐采用“${best.name}”：` +
    `货物长度方向超出 ${best.xOverhang.toFixed(0)} mm，宽度方向超出 ${best.yOverhang.toFixed(0)} mm。`;

  if (best.type === '多排') {
    text += `（${best.rows}排摆放）`;
  }

  summaryTextEl.textContent = text;
}

function drawDiagram(best, inputs) {
  const { trayLength, trayWidth } = inputs;
  const maxLength = Math.max(trayLength, trayWidth, best.totalLength || best.itemLength, best.totalWidth || best.itemWidth);
  const scale = 420 / maxLength;
  const padding = 56;

  const trayWidthPx = trayLength * scale;
  const trayHeightPx = trayWidth * scale;

  const trayX = padding;
  const trayY = 120;

  const itemX = trayX + (trayWidthPx - (best.totalLength || best.itemLength) * scale) / 2;
  const itemY = trayY + (trayHeightPx - (best.totalWidth || best.itemWidth) * scale) / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f7fafd';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 托盘
  ctx.fillStyle = '#dfeeff';
  ctx.strokeStyle = '#2b6eea';
  ctx.lineWidth = 2;
  ctx.fillRect(trayX, trayY, trayWidthPx, trayHeightPx);
  ctx.strokeRect(trayX, trayY, trayWidthPx, trayHeightPx);

  // 货物 - 按多排或单排处理
  if (best.type === '多排') {
    const itemLenPx = best.itemLength * scale;
    const itemWidPx = best.itemWidth * scale;
    const totalWidthPx = best.totalWidth * scale;

    for (let i = 0; i < best.rows; i++) {
      const rowY = itemY + i * itemWidPx;
      ctx.fillStyle = '#fde7c8';
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.fillRect(itemX, rowY, itemLenPx, itemWidPx);
      ctx.strokeRect(itemX, rowY, itemLenPx, itemWidPx);
    }

    const leftOverhangPx = Math.max(0, (best.itemLength - trayLength) * scale / 2);
    const rightOverhangPx = Math.max(0, (best.itemLength - trayLength) * scale / 2);
    const topOverhangPx = Math.max(0, (best.totalWidth - trayWidth) * scale / 2);
    const bottomOverhangPx = Math.max(0, (best.totalWidth - trayWidth) * scale / 2);

    if (leftOverhangPx > 0) {
      ctx.fillStyle = '#ffd29d';
      ctx.fillRect(itemX - leftOverhangPx, itemY, leftOverhangPx, totalWidthPx);
    }
    if (rightOverhangPx > 0) {
      ctx.fillStyle = '#ffd29d';
      ctx.fillRect(itemX + itemLenPx, itemY, rightOverhangPx, totalWidthPx);
    }
    if (topOverhangPx > 0) {
      ctx.fillStyle = '#ffd29d';
      ctx.fillRect(itemX, itemY - topOverhangPx, itemLenPx, topOverhangPx);
    }
    if (bottomOverhangPx > 0) {
      ctx.fillStyle = '#ffd29d';
      ctx.fillRect(itemX, itemY + totalWidthPx, itemLenPx, bottomOverhangPx);
    }
  } else {
    const itemLenPx = best.itemLength * scale;
    const itemWidPx = best.itemWidth * scale;

    ctx.fillStyle = '#fde7c8';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.fillRect(itemX, itemY, itemLenPx, itemWidPx);
    ctx.strokeRect(itemX, itemY, itemLenPx, itemWidPx);

    const leftOverhangPx = Math.max(0, (best.itemLength - trayLength) * scale / 2);
    const rightOverhangPx = Math.max(0, (best.itemLength - trayLength) * scale / 2);
    const topOverhangPx = Math.max(0, (best.itemWidth - trayWidth) * scale / 2);
    const bottomOverhangPx = Math.max(0, (best.itemWidth - trayWidth) * scale / 2);

    if (leftOverhangPx > 0) {
      ctx.fillStyle = '#ffd29d';
      ctx.fillRect(itemX - leftOverhangPx, itemY, leftOverhangPx, itemWidPx);
    }
    if (rightOverhangPx > 0) {
      ctx.fillStyle = '#ffd29d';
      ctx.fillRect(itemX + itemLenPx, itemY, rightOverhangPx, itemWidPx);
    }
    if (topOverhangPx > 0) {
      ctx.fillStyle = '#ffd29d';
      ctx.fillRect(itemX, itemY - topOverhangPx, itemLenPx, topOverhangPx);
    }
    if (bottomOverhangPx > 0) {
      ctx.fillStyle = '#ffd29d';
      ctx.fillRect(itemX, itemY + itemWidPx, itemLenPx, bottomOverhangPx);
    }
  }

  // 标注尺寸
  ctx.fillStyle = '#20304b';
  ctx.font = 'bold 14px Microsoft YaHei';
  ctx.textAlign = 'center';
  ctx.fillText(`${trayLength} mm`, trayX + trayWidthPx / 2, trayY - 18);
  ctx.save();
  ctx.translate(trayX - 24, trayY + trayHeightPx / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${trayWidth} mm`, 0, 0);
  ctx.restore();

  const itemWidthPxDisplay = (best.totalLength || best.itemLength) * scale;
  const itemHeightPxDisplay = (best.totalWidth || best.itemWidth) * scale;
  ctx.fillStyle = '#d97706';
  ctx.fillText(`${(best.totalLength || best.itemLength).toFixed(0)} mm`, itemX + itemWidthPxDisplay / 2, itemY + itemHeightPxDisplay + 22);
  ctx.save();
  ctx.translate(itemX + itemWidthPxDisplay + 20, itemY + itemHeightPxDisplay / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillText(`${(best.totalWidth || best.itemWidth).toFixed(0)} mm`, 0, 0);
  ctx.restore();

  if (best.type === '多排') {
    ctx.fillStyle = '#16a34a';
    ctx.font = 'bold 13px Microsoft YaHei';
    ctx.fillText(`${best.rows} 排`, itemX - 40, itemY + itemHeightPxDisplay / 2);
  }
}

function render() {
  const inputs = getInputs();
  const { best, scenarios } = computeScenario(inputs);

  recommendedLayoutEl.textContent = best.name;
  fitStatusEl.textContent = best.withinLimit ? '✓ 满足' : '✗ 超限';
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
