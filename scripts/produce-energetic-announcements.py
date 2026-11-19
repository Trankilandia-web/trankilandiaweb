import asyncio
import math
import os
import random
import shutil
import struct
import subprocess
import wave
from pathlib import Path
import edge_tts

ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT_DIR / "public" / "sounds" / "anuncios"
TEMP_DIR = OUTPUT_DIR / "_temp_prod"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
if TEMP_DIR.exists():
    shutil.rmtree(TEMP_DIR)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# 1. Generar 1 compás (1.9s) de base electrónica fitness a 126 BPM
FITNESS_LOOP_PATH = TEMP_DIR / "loop_1bar.wav"
sample_rate = 44100
bpm = 126
beat_dur = 60.0 / bpm
bar_dur = beat_dur * 4
total_samples = int(sample_rate * bar_dur)
loop_samples = [0.0] * total_samples

for b in range(4):
    start = int(b * beat_dur * sample_rate)
    for i in range(min(int(0.16 * sample_rate), total_samples - start)):
        t = i / sample_rate
        freq = 135 * math.exp(-25 * t) + 48
        loop_samples[start + i] += 0.40 * math.exp(-16 * t) * math.sin(2 * math.pi * freq * t)

for b in range(4):
    start = int((b + 0.5) * beat_dur * sample_rate)
    for i in range(min(int(0.05 * sample_rate), total_samples - start)):
        t = i / sample_rate
        loop_samples[start + i] += 0.12 * math.exp(-32 * t) * (random.random() * 2 - 1)

for i in range(total_samples):
    t = i / sample_rate
    bass = 0.12 * math.sin(2 * math.pi * 55 * t) + 0.08 * math.sin(2 * math.pi * 110 * t)
    stab = 0.07 * math.sin(2 * math.pi * 220 * t) + 0.05 * math.sin(2 * math.pi * 261.63 * t) + 0.05 * math.sin(2 * math.pi * 329.63 * t)
    loop_samples[i] += bass + stab * (0.5 + 0.5 * math.sin(2 * math.pi * (1 / beat_dur) * t))

max_val = max(abs(s) for s in loop_samples) or 1.0
with wave.open(str(FITNESS_LOOP_PATH), 'wb') as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(sample_rate)
    for s in loop_samples:
        norm = max(-1.0, min(1.0, s / max_val * 0.85))
        wf.writeframes(struct.pack('<h', int(norm * 32767)))

# 2. Generar Stinger de inicio enérgico (Arpegio ascendente brillante Do-Mi-Sol-Do)
STINGER_PATH = TEMP_DIR / "stinger.wav"
subprocess.run([
    "ffmpeg", "-y",
    "-f", "lavfi", "-i", "sine=frequency=523.25:duration=0.15",
    "-f", "lavfi", "-i", "sine=frequency=659.25:duration=0.15",
    "-f", "lavfi", "-i", "sine=frequency=783.99:duration=0.18",
    "-f", "lavfi", "-i", "sine=frequency=1046.50:duration=0.55",
    "-filter_complex",
    "[0:a]afade=t=out:st=0.10:d=0.05,volume=0.7[a0];"
    "[1:a]afade=t=out:st=0.10:d=0.05,volume=0.8[a1];"
    "[2:a]afade=t=out:st=0.12:d=0.06,volume=0.9[a2];"
    "[3:a]afade=t=out:st=0.25:d=0.30,volume=1.0[a3];"
    "[a0][a1][a2][a3]concat=n=4:v=0:a=1[out]",
    "-map", "[out]", "-ar", "44100", "-ac", "1", str(STINGER_PATH)
], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# 3. Textos con dicción motivadora, enérgica y alegre
ANNOUNCEMENTS = [
    {
        "id": "cierre-10min",
        "filename": "cierre-10min.mp3",
        "voice": "es-MX-DaliaNeural",
        "rate": "+12%",
        "pitch": "+5Hz",
        "text": (
            "¡Atención, guerreros! ¡Faltan solo diez minutos para cerrar el gimnasio! "
            "Vamos culminando esas últimas repeticiones con toda la fuerza y dejando las máquinas y mancuernas en orden. "
            "¡Muchísimas gracias por su entrega y por entrenar con nosotros hoy! ¡A darlo todo hasta el final!"
        )
    },
    {
        "id": "orden-accesorios",
        "filename": "orden-accesorios.mp3",
        "voice": "es-MX-DaliaNeural",
        "rate": "+12%",
        "pitch": "+5Hz",
        "text": (
            "¡Familia Trankilandia! Recuerden que el orden es parte de la disciplina. "
            "Al terminar su rutina, por favor regresen cada mancuerna, barra y accesorio a su lugar. "
            "¡Cuidemos nuestra casa y entrenemos con todo el poder!"
        )
    },
    {
        "id": "clases-grupales",
        "filename": "clases-grupales.mp3",
        "voice": "es-MX-DaliaNeural",
        "rate": "+14%",
        "pitch": "+6Hz",
        "text": (
            "¡Guerreros y guerreras! ¡Ya llegó nuestra profesora! "
            "Los esperamos a todos con la mejor vibra en el segundo piso para iniciar nuestras clases grupales con toda la energía. "
            "¡Suban ya y a darlo todo!"
        )
    }
]

async def produce_all():
    for ann in ANNOUNCEMENTS:
        print(f"\n==========================================")
        print(f"Produciendo audio de alta energía: {ann['id']}")
        print(f"==========================================")

        raw_voice_mp3 = TEMP_DIR / f"{ann['id']}_raw.mp3"
        voice_wav = TEMP_DIR / f"{ann['id']}_voice.wav"
        final_mp3 = OUTPUT_DIR / ann["filename"]

        # 1. Generar voz neural con pitch y rate dinámicos
        print(f"  - Generando voz con {ann['voice']} ({ann['rate']}, {ann['pitch']})...")
        comm = edge_tts.Communicate(
            text=ann["text"],
            voice=ann["voice"],
            rate=ann["rate"],
            pitch=ann["pitch"]
        )
        await comm.save(str(raw_voice_mp3))

        # 2. Medir duración exacta de la voz
        voice_dur = float(subprocess.check_output([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(raw_voice_mp3)
        ]).decode().strip())
        print(f"  - Duración de voz: {voice_dur:.2f}s")

        # 3. Procesar ecualización vocal para presencia en parlante bluetooth
        subprocess.run([
            "ffmpeg", "-y", "-i", str(raw_voice_mp3),
            "-af", "highpass=f=90,equalizer=f=3000:width_type=o:w=1:g=3.5,acompressor=threshold=-12dB:ratio=3.5:attack=5:release=50",
            "-ar", "44100", "-ac", "1",
            str(voice_wav)
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # 4. Mezclar en ffmpeg:
        #    - Input 0: Stinger de inicio (0.8s)
        #    - Input 1: Loop fitness infinito en loop
        #    - Input 2: Voz procesada
        #    La voz entra en 0.75s (adelay=750|750), el loop corre a -19dB, y se corta 1s después de la voz.
        total_dur = voice_dur + 1.8
        subprocess.run([
            "ffmpeg", "-y",
            "-i", str(STINGER_PATH),
            "-stream_loop", "-1", "-i", str(FITNESS_LOOP_PATH),
            "-i", str(voice_wav),
            "-filter_complex",
            f"[2:a]adelay=750|750,volume=1.45[voice];"
            f"[1:a]atrim=0:{total_dur},afade=t=out:st={total_dur-1.2}:d=1.2,volume=0.13[beat];"
            f"[0:a]volume=0.85[stinger];"
            f"[stinger][beat][voice]amix=inputs=3:duration=longest:dropout_transition=2[mix];"
            f"[mix]alimiter=limit=0.96[out]",
            "-map", "[out]",
            "-c:a", "libmp3lame", "-b:a", "192k", "-ar", "44100",
            str(final_mp3)
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        final_dur = float(subprocess.check_output([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(final_mp3)
        ]).decode().strip())
        print(f"  ✓ Masterizado exitoso: {ann['filename']} ({final_dur:.1f}s)")

    # Limpiar temporales
    try:
        shutil.rmtree(TEMP_DIR)
        if os.path.exists("fitness_loop_1bar.wav"):
            os.remove("fitness_loop_1bar.wav")
    except Exception as e:
        print("Aviso:", e)

    print("\n¡Todos los audios de alta energía y producción fitness fueron creados exitosamente!")

if __name__ == "__main__":
    asyncio.run(produce_all())
