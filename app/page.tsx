'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { odepaData, type Catalog, type DailyPoint, type Series } from '@/lib/data';

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('es-CL');
const shortDate = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', timeZone: 'UTC' });
const longDate = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Santiago' });
const longDateTime = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' });

function parseDate(value: string) { return new Date(`${value}T12:00:00Z`); }

function PriceChart({ points }: { points: DailyPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !points.length) return;
    const draw = () => {
      const context = canvas.getContext('2d');
      if (!context) return;
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      const margin = { top: 20, right: 18, bottom: 42, left: 62 };
      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;
      const rawMin = Math.min(...points.map((point) => point.minimum));
      const rawMax = Math.max(...points.map((point) => point.maximum));
      const padding = Math.max((rawMax - rawMin) * 0.12, rawMax * 0.03, 1);
      const yMin = Math.max(0, rawMin - padding);
      const yMax = rawMax + padding;
      const x = (index: number) => margin.left + (points.length === 1 ? chartWidth / 2 : index * chartWidth / (points.length - 1));
      const y = (value: number) => margin.top + (yMax - value) * chartHeight / (yMax - yMin || 1);

      context.font = '11px Inter, system-ui, sans-serif';
      context.fillStyle = '#7b8781';
      context.strokeStyle = '#e5e4dc';
      context.lineWidth = 1;
      for (let tick = 0; tick <= 4; tick += 1) {
        const value = yMin + (yMax - yMin) * tick / 4;
        const yy = y(value);
        context.beginPath(); context.moveTo(margin.left, yy); context.lineTo(width - margin.right, yy); context.stroke();
        context.textAlign = 'right'; context.fillText(money.format(value), margin.left - 10, yy + 4);
      }

      const labelCount = Math.min(5, points.length);
      for (let tick = 0; tick < labelCount; tick += 1) {
        const index = Math.round(tick * (points.length - 1) / Math.max(labelCount - 1, 1));
        context.textAlign = tick === 0 ? 'left' : tick === labelCount - 1 ? 'right' : 'center';
        context.fillText(shortDate.format(parseDate(points[index].date)), x(index), height - 14);
      }

      context.beginPath();
      points.forEach((point, index) => index === 0 ? context.moveTo(x(index), y(point.maximum)) : context.lineTo(x(index), y(point.maximum)));
      for (let index = points.length - 1; index >= 0; index -= 1) context.lineTo(x(index), y(points[index].minimum));
      context.closePath(); context.fillStyle = 'rgba(34,97,77,.11)'; context.fill();

      const line = (field: 'minimum' | 'average' | 'maximum', color: string, widthValue: number, dash: number[] = []) => {
        context.beginPath(); context.strokeStyle = color; context.lineWidth = widthValue; context.setLineDash(dash);
        points.forEach((point, index) => index === 0 ? context.moveTo(x(index), y(point[field])) : context.lineTo(x(index), y(point[field])));
        context.stroke(); context.setLineDash([]);
      };
      line('minimum', '#b97954', 1.5, [5, 4]);
      line('maximum', '#7d8e66', 1.5, [5, 4]);
      line('average', '#22614d', 3);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [points]);

  if (!points.length) return <div className="empty-chart">No hay observaciones para la combinación seleccionada.</div>;
  return <canvas ref={canvasRef} className="price-chart" role="img" aria-label="Gráfico histórico de precio mínimo, promedio y máximo" />;
}

function VolumeChart({ points }: { points: DailyPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !points.length) return;
    const draw = () => {
      const context = canvas.getContext('2d');
      if (!context) return;
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = width * ratio; canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, width, height);
      const margin = { top: 20, right: 18, bottom: 42, left: 62 };
      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;
      const maximum = Math.max(...points.map((point) => point.volume), 1);
      const x = (index: number) => margin.left + (index + .5) * chartWidth / points.length;
      const y = (value: number) => margin.top + (maximum - value) * chartHeight / maximum;
      context.font = '11px Inter, system-ui, sans-serif'; context.fillStyle = '#7b8781'; context.strokeStyle = '#e5e4dc';
      for (let tick = 0; tick <= 4; tick += 1) {
        const value = maximum * tick / 4; const yy = y(value);
        context.beginPath(); context.moveTo(margin.left, yy); context.lineTo(width - margin.right, yy); context.stroke();
        context.textAlign = 'right'; context.fillText(number.format(Math.round(value)), margin.left - 10, yy + 4);
      }
      const barWidth = Math.max(2, Math.min(18, chartWidth / points.length * .68));
      context.fillStyle = 'rgba(34,97,77,.67)';
      points.forEach((point, index) => context.fillRect(x(index) - barWidth / 2, y(point.volume), barWidth, margin.top + chartHeight - y(point.volume)));
      const labelCount = Math.min(5, points.length);
      for (let tick = 0; tick < labelCount; tick += 1) {
        const index = Math.round(tick * (points.length - 1) / Math.max(labelCount - 1, 1));
        context.textAlign = tick === 0 ? 'left' : tick === labelCount - 1 ? 'right' : 'center';
        context.fillText(shortDate.format(parseDate(points[index].date)), x(index), height - 14);
      }
    };
    draw(); const observer = new ResizeObserver(draw); observer.observe(canvas); return () => observer.disconnect();
  }, [points]);

  if (!points.length) return <div className="empty-chart">No hay volúmenes para la combinación seleccionada.</div>;
  return <canvas ref={canvasRef} className="price-chart" role="img" aria-label="Gráfico de volumen transado por fecha" />;
}

function ElasticityChart({ points }: { points: DailyPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const valid = useMemo(() => points.filter((point) => point.volume > 0 && point.average > 0), [points]);
  const regression = useMemo(() => {
    if (valid.length < 2) return null;
    const values = valid.map((point) => ({ x: Math.log(point.volume), y: Math.log(point.average) }));
    const meanX = values.reduce((sum, item) => sum + item.x, 0) / values.length;
    const meanY = values.reduce((sum, item) => sum + item.y, 0) / values.length;
    const denominator = values.reduce((sum, item) => sum + (item.x - meanX) ** 2, 0);
    if (!denominator) return null;
    const beta = values.reduce((sum, item) => sum + (item.x - meanX) * (item.y - meanY), 0) / denominator;
    return { beta, intercept: meanY - beta * meanX };
  }, [valid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !valid.length) return;
    const draw = () => {
      const context = canvas.getContext('2d'); if (!context) return;
      const ratio = window.devicePixelRatio || 1; const width = canvas.clientWidth; const height = canvas.clientHeight;
      canvas.width = width * ratio; canvas.height = height * ratio; context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, width, height);
      const margin = { top: 22, right: 22, bottom: 48, left: 68 }; const chartWidth = width - margin.left - margin.right; const chartHeight = height - margin.top - margin.bottom;
      const volumes = valid.map((point) => point.volume); const prices = valid.map((point) => point.average);
      const xMin = Math.min(...volumes); const xMax = Math.max(...volumes); const yMin = Math.min(...prices); const yMax = Math.max(...prices);
      const x = (value: number) => margin.left + (value - xMin) * chartWidth / (xMax - xMin || 1);
      const y = (value: number) => margin.top + (yMax - value) * chartHeight / (yMax - yMin || 1);
      context.font = '11px Inter, system-ui, sans-serif'; context.fillStyle = '#7b8781'; context.strokeStyle = '#e5e4dc';
      for (let tick = 0; tick <= 4; tick += 1) {
        const price = yMin + (yMax - yMin) * tick / 4; const yy = y(price);
        context.beginPath(); context.moveTo(margin.left, yy); context.lineTo(width - margin.right, yy); context.stroke();
        context.textAlign = 'right'; context.fillText(money.format(price), margin.left - 10, yy + 4);
        const volume = xMin + (xMax - xMin) * tick / 4; context.textAlign = tick === 0 ? 'left' : tick === 4 ? 'right' : 'center'; context.fillText(number.format(Math.round(volume)), x(volume), height - 16);
      }
      context.fillStyle = 'rgba(34,97,77,.6)'; valid.forEach((point) => { context.beginPath(); context.arc(x(point.volume), y(point.average), 4, 0, Math.PI * 2); context.fill(); });
      if (regression) {
        const priceAt = (volume: number) => Math.exp(regression.intercept + regression.beta * Math.log(volume));
        context.beginPath(); context.moveTo(x(xMin), y(priceAt(xMin))); context.lineTo(x(xMax), y(priceAt(xMax))); context.strokeStyle = '#b97954'; context.lineWidth = 2.5; context.setLineDash([7, 5]); context.stroke(); context.setLineDash([]);
      }
    };
    draw(); const observer = new ResizeObserver(draw); observer.observe(canvas); return () => observer.disconnect();
  }, [valid, regression]);

  if (valid.length < 2) return <div className="empty-chart">Se necesitan al menos dos días con precio y volumen positivos.</div>;
  return <div><canvas ref={canvasRef} className="price-chart" role="img" aria-label="Dispersión entre volumen transado y precio promedio con tendencia de elasticidad" /><div className="axis-labels"><span>Precio promedio</span><span>Volumen transado →</span></div><p className="elasticity-value">Elasticidad estimada precio/cantidad: <strong>{regression ? regression.beta.toFixed(2) : '—'}</strong></p></div>;
}

export default function Home() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [series, setSeries] = useState<Series>({ daily: [], markets: [] });
  const [loadError, setLoadError] = useState(false);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [subsector, setSubsector] = useState('Todos los tipos');
  const [product, setProduct] = useState('Papa');
  const [market, setMarket] = useState('Todos los mercados');
  const [unit, setUnit] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    odepaData.getCatalog()
      .then((data) => {
        setCatalog(data);
        if (!data.products.some((item) => item.name === 'Papa')) setProduct(data.products[0]?.name ?? '');
        const start = new Date(`${data.meta.max_data_date}T12:00:00Z`);
        start.setUTCDate(start.getUTCDate() - 64);
        setFrom(start.toISOString().slice(0, 10));
        setTo(data.meta.max_data_date);
      })
      .catch(() => setLoadError(true));
  }, []);

  const productOptions = useMemo(() => {
    if (!catalog) return [];
    const options = subsector === 'Todos los tipos'
      ? catalog.products
      : catalog.products.filter((item) => item.subsector === subsector);
    return options.map((item) => item.name);
  }, [catalog, subsector]);

  const unitOptions = catalog?.products.find((item) => item.name === product)?.units ?? [];
  const effectiveUnit = unitOptions.includes(unit) ? unit : (unitOptions[0] ?? '');

  useEffect(() => {
    if (!catalog || !product || !effectiveUnit || !from || !to) return;
    let active = true;
    setSeriesLoading(true);
    odepaData.getSeries({
      product,
      unit: effectiveUnit,
      market: market === 'Todos los mercados' ? undefined : market,
      from,
      to,
    }).then((nextSeries) => {
      if (active) setSeries(nextSeries);
    }).catch(() => {
      if (active) setLoadError(true);
    }).finally(() => {
      if (active) setSeriesLoading(false);
    });
    return () => { active = false; };
  }, [catalog, product, effectiveUnit, market, from, to]);

  const dailyPoints = series.daily;
  const marketPoints = series.markets;

  const metrics = useMemo(() => {
    if (!dailyPoints.length) return { average: 0, minimum: 0, maximum: 0, volume: 0 };
    const volume = dailyPoints.reduce((sum, point) => sum + point.volume, 0);
    return { average: dailyPoints.reduce((sum, point) => sum + point.average * point.volume, 0) / volume, minimum: Math.min(...dailyPoints.map((point) => point.minimum)), maximum: Math.max(...dailyPoints.map((point) => point.maximum)), volume };
  }, [dailyPoints]);

  const fetchedAt = catalog ? longDateTime.format(new Date(catalog.meta.fetched_at)) : '—';
  const maxDataDate = catalog ? longDate.format(parseDate(catalog.meta.max_data_date)) : '—';

  if (loadError && !catalog) return <main className="state-page"><h1>No pudimos cargar el historial.</h1><p>La fuente quedó temporalmente indisponible. Intenta nuevamente.</p></main>;
  if (!catalog) return <main className="state-page"><span className="loader" /><h1>Cargando datos ODEPA…</h1></main>;

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Campo Claro, inicio"><span className="brand-mark" aria-hidden="true"><i /></span><span>Campo Claro</span></a>
        <nav aria-label="Navegación principal"><a className="active" href="#evolucion">Evolución</a><a href="#mercados">Mercados</a><a href="#fuente">Fuente</a></nav>
        <span className="official-badge"><i /> Fuente oficial ODEPA</span>
      </header>

      <section className="hero" id="inicio">
        <div><p className="eyebrow">Inteligencia mayorista · Chile</p><h1>Precios del campo,<br /><em>sin ruido.</em></h1><p className="hero-copy">Consulta la evolución de los precios de frutas y hortalizas en los principales mercados de Chile.</p></div>
        <div className="freshness-card"><span className="pulse" /><div><strong>Datos actualizados al {fetchedAt}</strong><small>Último registro ODEPA: {maxDataDate}</small></div><span className="freshness-time">CLT</span></div>
      </section>

      <section className="dashboard" id="evolucion">
        <div className="filters" aria-label="Filtros del historial">
          <label>Tipo de producto<select value={subsector} onChange={(event) => { const next = event.target.value; setSubsector(next); const nextProducts = next === 'Todos los tipos' ? catalog.products : catalog.products.filter((item) => item.subsector === next); if (!nextProducts.some((item) => item.name === product)) setProduct(nextProducts[0]?.name ?? ''); setUnit(''); }}><option>Todos los tipos</option>{catalog.subsectors.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Producto<select value={product} onChange={(event) => { setProduct(event.target.value); setUnit(''); }}>
            {productOptions.map((item) => <option key={item}>{item}</option>)}
          </select><small>{productOptions.length} productos disponibles</small></label>
          <label>Mercado<select value={market} onChange={(event) => setMarket(event.target.value)}><option>Todos los mercados</option>{catalog.markets.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Unidad original<select value={effectiveUnit} onChange={(event) => setUnit(event.target.value)}>{unitOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <div className="date-filter"><span>Rango de fechas</span><div><label><small>Desde</small><input type="date" min={catalog.meta.min_data_date} max={to} value={from} onChange={(event) => setFrom(event.target.value)} /></label><label><small>Hasta</small><input type="date" min={from} max={catalog.meta.max_data_date} value={to} onChange={(event) => setTo(event.target.value)} /></label></div></div>
        </div>

        <div className="section-heading"><div><span className="produce-dot" /><h2>{product}</h2><span className="unit-pill">{effectiveUnit}</span></div><p>{seriesLoading ? 'Actualizando resultados…' : `${market} · ${dailyPoints.length} días con datos`}</p></div>
        <div className="metrics">
          <article className="metric featured"><span>Precio promedio ponderado</span><strong>{money.format(metrics.average)}</strong><small>Para el periodo y filtros seleccionados</small></article>
          <article className="metric"><span>Mínimo observado</span><strong>{money.format(metrics.minimum)}</strong><small>Unidad original</small></article>
          <article className="metric"><span>Máximo observado</span><strong>{money.format(metrics.maximum)}</strong><small>Unidad original</small></article>
          <article className="metric"><span>Volumen informado</span><strong>{number.format(metrics.volume)}</strong><small>Unidades de comercialización</small></article>
        </div>

        <article className="panel chart-panel">
          <div className="panel-title"><div><p>Evolución histórica</p><h3>Precio mínimo, promedio y máximo</h3></div><div className="legend"><span className="legend-min">Mínimo</span><span className="legend-avg">Promedio</span><span className="legend-max">Máximo</span></div></div>
          <PriceChart points={dailyPoints} />
          <p className="chart-note">El promedio se pondera por el volumen informado. La banda representa el rango mínimo–máximo. Nunca se mezclan unidades de comercialización distintas.</p>
        </article>

        <article className="panel chart-panel">
          <div className="panel-title"><div><p>Actividad mayorista</p><h3>Volumen transado por día</h3></div><div className="legend"><span className="legend-volume">Volumen</span></div></div>
          <VolumeChart points={dailyPoints} />
          <p className="chart-note">Suma del volumen informado por ODEPA para el producto, mercado, unidad y rango seleccionados.</p>
        </article>

        <article className="panel chart-panel">
          <div className="panel-title"><div><p>Elasticidad observada</p><h3>Precio promedio respecto de la cantidad</h3></div><div className="legend"><span className="legend-points">Días</span><span className="legend-trend">Tendencia</span></div></div>
          <ElasticityChart points={dailyPoints} />
          <p className="chart-note">Cada punto representa un día. El coeficiente se estima con una regresión logarítmica precio–cantidad: indica el cambio porcentual asociado del precio ante un 1% de cambio en el volumen. Es una relación descriptiva y no demuestra causalidad.</p>
        </article>

        <article className="panel table-panel" id="mercados">
          <div className="panel-title"><div><p>Comparación</p><h3>Resumen por mercado</h3></div><span>{marketPoints.length} mercados</span></div>
          <div className="table-scroll"><table><thead><tr><th>Mercado</th><th>Observaciones</th><th>Volumen</th><th>Mínimo</th><th>Máximo</th><th>Promedio ponderado</th></tr></thead><tbody>{marketPoints.map((row) => <tr key={row.market}><td><strong>{row.market}</strong></td><td>{number.format(row.observations)}</td><td>{number.format(row.volume)}</td><td>{money.format(row.minimum)}</td><td>{money.format(row.maximum)}</td><td className="price-cell">{money.format(row.average)}</td></tr>)}</tbody></table></div>
        </article>

        <aside className="source-card" id="fuente"><div><p className="eyebrow">Trazabilidad de datos</p><h3>{number.format(catalog.meta.source_rows)} filas originales verificadas</h3><p>La interfaz usa una instantánea generada directamente desde el CSV oficial. Contiene {catalog.products.length} productos y {catalog.markets.length} mercados. El frontend consulta un adaptador independiente, preparado para cambiar a la API normalizada sin rehacer la experiencia.</p></div><a href={catalog.meta.source_url} target="_blank" rel="noreferrer">Abrir CSV oficial ↗</a></aside>
      </section>
    </main>
  );
}
