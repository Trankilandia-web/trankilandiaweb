import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'public', 'sounds', 'anuncios');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const tempDir = path.join(outputDir, '_temp');
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir, { recursive: true });

// 1. Chime generator usando ffmpeg (Campana armónica D5 -> A5 + pausa)
const chimePath = path.join(tempDir, 'chime.wav');
console.log('Generando jingle de campana (Ding-Dong)...');
try {
  execSync(
    `ffmpeg -y -f lavfi -i "sine=frequency=587.33:duration=0.28" ` +
    `-f lavfi -i "sine=frequency=880:duration=0.48" ` +
    `-f lavfi -i "anullsrc=r=44100:cl=mono:d=0.35" ` +
    `-filter_complex "[0:a]afade=t=out:st=0.18:d=0.10,volume=0.85[a0];` +
    `[1:a]afade=t=out:st=0.30:d=0.18,volume=1.0[a1];` +
    `[2:a]volume=0[a2];` +
    `[a0][a1][a2]concat=n=3:v=0:a=1[out]" ` +
    `-map "[out]" -ar 44100 -ac 1 "${chimePath}"`,
    { stdio: 'inherit' }
  );
} catch (e) {
  console.error('Error generando chime:', e);
}

const announcements = [
  {
    id: 'cierre-10min',
    filename: 'cierre-10min.mp3',
    chunks: [
      '¡Atención, guerreros!',
      'Les recordamos que faltan 10 minutos para cerrar el gimnasio.',
      'Por favor, vayan culminando sus rutinas y dejando las máquinas en orden para realizar el cierre a la hora establecida.',
      '¡Muchas gracias por su comprensión y por entrenar con nosotros!'
    ]
  },
  {
    id: 'orden-accesorios',
    filename: 'orden-accesorios.mp3',
    chunks: [
      'Estimados guerreros, recuerden devolver y guardar cada accesorio en su lugar después de utilizarlo.',
      '¡El orden es responsabilidad de todos!'
    ]
  },
  {
    id: 'clases-grupales',
    filename: 'clases-grupales.mp3',
    chunks: [
      '¡Guerreros!',
      'Ya llegó nuestra profesora.',
      '¡Los esperamos en el segundo piso para disfrutar de nuestras clases grupales!'
    ]
  }
];

async function fetchAudioChunk(text, lang = 'es-US') {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status} fetching TTS for: ${text}`);
  }
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

async function run() {
  for (const ann of announcements) {
    console.log(`\n========================================`);
    console.log(`Procesando anuncio: ${ann.id}`);
    console.log(`========================================`);
    
    // Lista de inputs para ffmpeg: primero el chime, luego cada chunk
    const inputArgs = [`-i "${chimePath}"`];
    let filterStreams = `[0:a]`;
    
    for (let i = 0; i < ann.chunks.length; i++) {
      const chunkText = ann.chunks[i];
      const rawMp3 = path.join(tempDir, `${ann.id}_${i}_raw.mp3`);
      const convertedWav = path.join(tempDir, `${ann.id}_${i}.wav`);
      
      console.log(`  - Descargando chunk ${i + 1}/${ann.chunks.length}: "${chunkText.substring(0, 50)}..."`);
      const buf = await fetchAudioChunk(chunkText);
      fs.writeFileSync(rawMp3, buf);

      // Decodificar a WAV PCM estándar 44100Hz mono con volumen balanceado
      execSync(
        `ffmpeg -y -i "${rawMp3}" -ar 44100 -ac 1 -af "volume=1.25" "${convertedWav}"`,
        { stdio: 'ignore' }
      );

      inputArgs.push(`-i "${convertedWav}"`);
      filterStreams += `[${i + 1}:a]`;
    }

    const totalInputs = ann.chunks.length + 1;
    const finalMp3Path = path.join(outputDir, ann.filename);

    console.log(`  - Concatenando ${totalInputs} pistas de audio con filter_complex...`);
    const filterComplex = `${filterStreams}concat=n=${totalInputs}:v=0:a=1[out]`;
    const fullCmd = `ffmpeg -y ${inputArgs.join(' ')} -filter_complex "${filterComplex}" -map "[out]" -c:a libmp3lame -b:a 192k -ar 44100 "${finalMp3Path}"`;
    
    execSync(fullCmd, { stdio: 'ignore' });

    // Medir duración exacta del archivo generado
    const durationStr = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalMp3Path}"`
    ).toString().trim();
    console.log(`  ✓ Generado: ${ann.filename} (Duración: ${parseFloat(durationStr).toFixed(1)}s)`);
  }

  // Limpiar temporales
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (err) {
    console.warn('Advertencia limpiando temp:', err);
  }

  console.log('\n========================================');
  console.log('¡Todos los anuncios fueron creados con éxito y fidelidad completa!');
}

run().catch(err => {
  console.error('Error generando audios:', err);
  process.exit(1);
});
