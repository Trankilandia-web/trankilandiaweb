import { DatosStoryCard, ConfigStoryCard } from '../types/evaluacion';

/**
 * Renderiza la tarjeta de evolución corporal en un HTML5 Canvas en alta resolución
 * (1080x1920 para formato Story 9:16 o 1080x1080 para formato Post 1:1)
 */
export async function renderizarStoryCardCanvas(
  canvas: HTMLCanvasElement,
  datos: DatosStoryCard,
  config: ConfigStoryCard
): Promise<void> {
  const isStory = config.formato === 'story_9_16';
  const width = 1080;
  const height = isStory ? 1920 : 1080;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Helper para esquinas redondeadas compatible con todos los navegadores
  const roundRect = (
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill = true,
    stroke = false
  ) => {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
      return;
    }
    if (ctx.quadraticCurveTo) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
      return;
    }
    if (fill && ctx.fillRect) ctx.fillRect(x, y, w, h);
    if (stroke && ctx.strokeRect) ctx.strokeRect(x, y, w, h);
  };

  // 1. DIBUJAR FONDO SEGÚN TEMPLATE
  if (config.template === 'gradient_fire') {
    // Fondo Degradado Fuego Oscuro
    if (ctx.createLinearGradient) {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#180702');
      grad.addColorStop(0.35, '#2a0e05');
      grad.addColorStop(0.7, '#0f0502');
      grad.addColorStop(1, '#09090b');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = '#180702';
    }
    ctx.fillRect(0, 0, width, height);

    // Resplandor cálido en el centro
    if (ctx.createRadialGradient) {
      const radial = ctx.createRadialGradient(
        width / 2,
        height * 0.42,
        50,
        width / 2,
        height * 0.42,
        width * 0.7
      );
      radial.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
      radial.addColorStop(0.6, 'rgba(239, 68, 68, 0.08)');
      radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, width, height);
    }
  } else if (config.template === 'neon_gym') {
    // Fondo Neon Cyber-Gym
    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, width, height);

    if (ctx.createRadialGradient) {
      const gradTop = ctx.createRadialGradient(
        width * 0.2,
        height * 0.15,
        20,
        width * 0.2,
        height * 0.15,
        500
      );
      gradTop.addColorStop(0, 'rgba(6, 182, 212, 0.22)');
      gradTop.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradTop;
      ctx.fillRect(0, 0, width, height);

      const gradBottom = ctx.createRadialGradient(
        width * 0.8,
        height * 0.85,
        20,
        width * 0.8,
        height * 0.85,
        500
      );
      gradBottom.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
      gradBottom.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradBottom;
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    // Minimal Dark (Elegante y sobrio)
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, width, height);

    // Borde exterior refinado
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 4;
    roundRect(30, 30, width - 60, height - 60, 40, false, true);

    if (ctx.createRadialGradient) {
      const radial = ctx.createRadialGradient(
        width / 2,
        height * 0.35,
        30,
        width / 2,
        height * 0.35,
        500
      );
      radial.addColorStop(0, 'rgba(245, 158, 11, 0.12)');
      radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, width, height);
    }
  }

  // 2. HEADER: BRANDING OFICIAL
  ctx.textAlign = 'center';
  const startY = isStory ? 150 : 100;

  // Marca Gym
  ctx.font = '900 48px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#F59E0B';
  ctx.letterSpacing = '6px';
  ctx.fillText('TRANKILANDIA GYM', width / 2, startY);

  // Subtítulo
  ctx.font = '700 20px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText('EVOLUCIÓN CORPORAL & BIOIMPEDANCIA', width / 2, startY + 45);

  // Fecha y Socio Pill
  const pillY = startY + 80;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1.5;
  roundRect(width / 2 - 240, pillY, 480, 48, 24, true, true);

  ctx.font = '600 18px monospace';
  ctx.fillStyle = '#E4E4E7';
  const txtSocio = datos.socioNombre ? `${datos.socioNombre} · ` : '';
  ctx.fillText(`${txtSocio}${datos.fechaFormateada}`, width / 2, pillY + 31);

  // 3. FIT SCORE ORB / CÁPSULA
  const scoreCenterY = isStory ? startY + 310 : startY + 230;
  const orbRadius = isStory ? 120 : 90;

  // Círculo exterior iluminado
  ctx.beginPath();
  ctx.arc(width / 2, scoreCenterY, orbRadius, 0, Math.PI * 2);
  if (ctx.createLinearGradient) {
    const orbGrad = ctx.createLinearGradient(
      width / 2,
      scoreCenterY - orbRadius,
      width / 2,
      scoreCenterY + orbRadius
    );
    orbGrad.addColorStop(0, '#f59e0b');
    orbGrad.addColorStop(1, '#d97706');
    ctx.fillStyle = orbGrad;
  } else {
    ctx.fillStyle = '#f59e0b';
  }
  ctx.fill();

  // Borde resplandeciente
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.stroke();

  // Texto Score
  ctx.textAlign = 'center';
  ctx.fillStyle = '#000000';
  ctx.font = '900 18px monospace';
  ctx.fillText('FIT SCORE', width / 2, scoreCenterY - (isStory ? 45 : 30));

  ctx.font = `900 ${isStory ? '88px' : '72px'} monospace`;
  ctx.fillText(String(datos.fitScore), width / 2, scoreCenterY + (isStory ? 28 : 22));

  ctx.font = '700 16px monospace';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillText('/ 100 PTS', width / 2, scoreCenterY + (isStory ? 60 : 50));

  // 4. HERO METRIC CARD (MÉTRICA DESTACADA XXL)
  const heroCardY = isStory ? scoreCenterY + 180 : scoreCenterY + 130;
  const heroCardW = width - 140;
  const heroCardH = isStory ? 240 : 180;
  const heroCardX = 70;

  ctx.fillStyle = 'rgba(15, 15, 18, 0.85)';
  ctx.strokeStyle = config.template === 'neon_gym' ? '#06B6D4' : '#F59E0B';
  ctx.lineWidth = 3;
  roundRect(heroCardX, heroCardY, heroCardW, heroCardH, 36, true, true);

  // Etiqueta destacada
  ctx.font = '900 24px monospace';
  ctx.fillStyle = datos.metricaDestacada.colorHex || '#F59E0B';
  ctx.fillText(
    `★ ${datos.metricaDestacada.etiqueta} ★`,
    width / 2,
    heroCardY + (isStory ? 65 : 50)
  );

  // Valor XXL
  ctx.font = `900 ${isStory ? '102px' : '76px'} monospace`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(
    datos.metricaDestacada.valorPrincipal,
    width / 2,
    heroCardY + (isStory ? 165 : 130)
  );

  // Subtexto explicativo
  if (isStory) {
    ctx.font = '600 19px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillText('Transformación medible con báscula segmental EUROMAR® G78', width / 2, heroCardY + 205);
  }

  // 5. GRILLA DE 4 MÉTRICAS COMPLEMENTARIAS
  const gridY = isStory ? heroCardY + 280 : heroCardY + 215;
  const gap = 24;
  const boxW = (width - 140 - gap) / 2;
  const boxH = isStory ? 170 : 130;

  const metricas = [
    { label: 'MASA MUSCULAR', val: `${datos.musculoKg} kg`, color: '#10B981' },
    { label: 'GRASA CORPORAL', val: `${datos.grasaPct}%`, color: '#F59E0B' },
    { label: 'GRASA VISCERAL', val: `Nivel ${datos.grasaVisceral}`, color: '#EF4444' },
    { label: 'PESO TOTAL', val: `${datos.pesoKg} kg`, color: '#38BDF8' },
  ];

  metricas.forEach((m, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = heroCardX + col * (boxW + gap);
    const y = gridY + row * (boxH + gap);

    ctx.fillStyle = 'rgba(24, 24, 27, 0.8)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    roundRect(x, y, boxW, boxH, 24, true, true);

    // Label
    ctx.textAlign = 'left';
    ctx.font = '800 18px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(m.label, x + 30, y + (isStory ? 45 : 38));

    // Valor
    ctx.font = `900 ${isStory ? '48px' : '38px'} monospace`;
    ctx.fillStyle = m.color;
    ctx.fillText(m.val, x + 30, y + (isStory ? 115 : 92));
  });

  // 6. MEDALLA DESTACADA (SI EXISTE Y ES FORMATO STORY)
  if (isStory && datos.medallaDestacada) {
    const medalY = gridY + boxH * 2 + gap + 40;
    ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 2;
    roundRect(heroCardX, medalY, heroCardW, 90, 26, true, true);

    ctx.textAlign = 'center';
    ctx.font = '800 24px monospace';
    ctx.fillStyle = '#F59E0B';
    ctx.fillText(
      `🏅 LOGRO: ${datos.medallaDestacada.titulo.toUpperCase()} (${datos.medallaDestacada.nivel.toUpperCase()})`,
      width / 2,
      medalY + 54
    );
  }

  // 7. FOOTER & HASHTAGS
  const footerY = height - (isStory ? 110 : 65);
  ctx.textAlign = 'center';
  ctx.font = '700 22px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText(datos.hashtags.slice(0, 3).join('   '), width / 2, footerY);

  ctx.font = '500 16px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText('trankilandiagym.qatuweb.com', width / 2, footerY + 35);
}
