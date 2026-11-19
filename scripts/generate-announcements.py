import asyncio
import os
import shutil
import subprocess
from pathlib import Path
import edge_tts

ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT_DIR / "public" / "sounds" / "anuncios"
TEMP_DIR = OUTPUT_DIR / "_temp"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
if TEMP_DIR.exists():
    shutil.rmtree(TEMP_DIR)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

CHIME_PATH = TEMP_DIR / "chime.wav"

# Generar Chime de campana armónico (Ding-Dong profesional + 0.35s de respiro)
print("Generando jingle de campana (Ding-Dong)...")
subprocess.run([
    "ffmpeg", "-y",
    "-f", "lavfi", "-i", "sine=frequency=587.33:duration=0.28",
    "-f", "lavfi", "-i", "sine=frequency=880:duration=0.48",
    "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono:d=0.35",
    "-filter_complex",
    "[0:a]afade=t=out:st=0.18:d=0.10,volume=0.85[a0];"
    "[1:a]afade=t=out:st=0.30:d=0.18,volume=1.0[a1];"
    "[2:a]volume=0[a2];"
    "[a0][a1][a2]concat=n=3:v=0:a=1[out]",
    "-map", "[out]", "-ar", "44100", "-ac", "1", str(CHIME_PATH)
], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# Anuncios sin emojis, con puntuación natural y dicción perfecta para sala de gimnasio
ANNOUNCEMENTS = [
    {
        "id": "cierre-10min",
        "filename": "cierre-10min.mp3",
        "voice": "es-PE-CamilaNeural",
        "rate": "+0%",
        "pitch": "+0Hz",
        "text": (
            "¡Atención, guerreros! Les recordamos que faltan diez minutos para cerrar el gimnasio. "
            "Por favor, vayan culminando sus rutinas y dejando las máquinas en orden para realizar el cierre "
            "a la hora establecida. ¡Muchas gracias por su comprensión y por entrenar con nosotros!"
        )
    },
    {
        "id": "orden-accesorios",
        "filename": "orden-accesorios.mp3",
        "voice": "es-PE-CamilaNeural",
        "rate": "+0%",
        "pitch": "+0Hz",
        "text": (
            "Estimados guerreros, recuerden devolver y guardar cada accesorio en su lugar después de utilizarlo. "
            "¡El orden es responsabilidad de todos!"
        )
    },
    {
        "id": "clases-grupales",
        "filename": "clases-grupales.mp3",
        "voice": "es-PE-CamilaNeural",
        "rate": "+0%",
        "pitch": "+0Hz",
        "text": (
            "¡Guerreros! Ya llegó nuestra profesora. "
            "¡Los esperamos en el segundo piso para disfrutar de nuestras clases grupales!"
        )
    }
]

async def generate_announcements():
    for ann in ANNOUNCEMENTS:
        print(f"\nGenerando anuncio neural: {ann['id']} con voz '{ann['voice']}'...")
        voice_raw_mp3 = TEMP_DIR / f"{ann['id']}_voice.mp3"
        voice_wav = TEMP_DIR / f"{ann['id']}_voice.wav"
        final_mp3 = OUTPUT_DIR / ann["filename"]

        # 1. Síntesis neural natural de Microsoft Edge (Azure Speech)
        communicate = edge_tts.Communicate(
            text=ann["text"],
            voice=ann["voice"],
            rate=ann["rate"],
            pitch=ann["pitch"]
        )
        await communicate.save(str(voice_raw_mp3))

        # 2. Convertir voz a WAV 44100Hz mono con volumen equilibrado
        subprocess.run([
            "ffmpeg", "-y", "-i", str(voice_raw_mp3),
            "-ar", "44100", "-ac", "1", "-af", "volume=1.2",
            str(voice_wav)
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # 3. Concatenar Chime + Voz con ffmpeg
        subprocess.run([
            "ffmpeg", "-y",
            "-i", str(CHIME_PATH),
            "-i", str(voice_wav),
            "-filter_complex", "[0:a][1:a]concat=n=2:v=0:a=1[out]",
            "-map", "[out]",
            "-c:a", "libmp3lame", "-b:a", "192k", "-ar", "44100",
            str(final_mp3)
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # 4. Medir duración
        duration = subprocess.check_output([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(final_mp3)
        ]).decode().strip()

        print(f"  ✓ Archivo creado: {ann['filename']} (Duración total con chime: {float(duration):.1f}s)")

    # Limpiar temporales
    try:
        shutil.rmtree(TEMP_DIR)
    except Exception as e:
        print("Aviso limpiando temporales:", e)

    print("\n¡Todos los audios neurales de alta fidelidad fueron generados exitosamente!")

if __name__ == "__main__":
    asyncio.run(generate_announcements())
