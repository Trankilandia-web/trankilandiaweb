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
TEMP_DIR = OUTPUT_DIR / "_temp_energy"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
if TEMP_DIR.exists():
    shutil.rmtree(TEMP_DIR)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

def generate_fitness_music_bed(output_wav_path, duration_sec):
    """
    Sintetiza una base musical electrónica moderna de fitness (126 BPM)
    con bombo enérgico, hi-hats rítmicos y acordes motivadores de sintetizador.
    """
    sample_rate = 44100
    bpm = 126
    beat_dur = 60.0 / bpm  # ~0.476s
    total_samples = int(sample_rate * duration_sec)
    samples = [0.0] * total_samples

    # 1. Bombo enérgico 4-on-the-floor
    total_beats = int(duration_sec / beat_dur)
    for beat in range(total_beats):
        start_s = int(beat * beat_dur * sample_rate)
        kick_len = int(0.18 * sample_rate)
        for i in range(min(kick_len, total_samples - start_s)):
            t = i / sample_rate
            freq = 135 * math.exp(-24 * t) + 48
            env = math.exp(-15 * t)
            samples[start_s + i] += 0.38 * env * math.sin(2 * math.pi * freq * t)

    # 2. Hi-hat rítmico en contratiempos (off-beat fitness drive)
    for beat in range(total_beats):
        start_s = int((beat + 0.5) * beat_dur * sample_rate)
        hat_len = int(0.06 * sample_rate)
        for i in range(min(hat_len, total_samples - start_s)):
            t = i / sample_rate
            env = math.exp(-32 * t)
            noise = (random.random() * 2 - 1)
            samples[start_s + i] += 0.12 * env * noise

    # 3. Progresión motivadora de sintetizador (Am -> F -> C -> G)
    chords = [
        [220.0, 261.63, 329.63],  # Am
        [174.61, 220.0, 261.63],  # F
        [261.63, 329.63, 392.0],   # C
        [196.0, 246.94, 293.66],   # G
    ]
    bar_dur = beat_dur * 4  # 1.90s
    for bar in range(int(duration_sec / bar_dur) + 2):
        chord = chords[bar % len(chords)]
        start_s = int(bar * bar_dur * sample_rate)
        bar_samples = int(bar_dur * sample_rate)
        for i in range(min(bar_samples, total_samples - start_s)):
            t = i / sample_rate
            env = 0.55 * (1 - math.exp(-5 * t)) * math.exp(-0.2 * t)
            val = 0
            for freq in chord:
                val += math.sin(2 * math.pi * freq * (start_s + i) / sample_rate)
                val += 0.35 * math.sin(4 * math.pi * freq * (start_s + i) / sample_rate)
            samples[start_s + i] += 0.10 * env * val

    # 4. Fade in al inicio (0.3s) y Fade out al final (1.5s)
    fade_in_samples = int(0.3 * sample_rate)
    fade_out_samples = int(1.5 * sample_rate)
    for i in range(fade_in_samples):
        samples[i] *= (i / fade_in_samples)
    for i in range(fade_out_samples):
        idx = total_samples - 1 - i
        samples[idx] *= (i / fade_out_samples)

    # Normalizar
    max_val = max(abs(s) for s in samples) or 1.0
    with wave.open(str(output_wav_path), 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        for s in samples:
            norm = max(-1.0, min(1.0, s / max_val * 0.9))
            wf.writeframes(struct.pack('<h', int(norm * 32767)))

# Intro jingle con acorde mayor brillante y subida energética
CHIME_PATH = TEMP_DIR / "energy_stinger.wav"
print("Generando stinger de inicio fitness...")
subprocess.run([
    "ffmpeg", "-y",
    "-f", "lavfi", "-i", "sine=frequency=523.25:duration=0.18",
    "-f", "lavfi", "-i", "sine=frequency=659.25:duration=0.18",
    "-f", "lavfi", "-i", "sine=frequency=783.99:duration=0.22",
    "-f", "lavfi", "-i", "sine=frequency=1046.50:duration=0.55",
    "-filter_complex",
    "[0:a]afade=t=out:st=0.12:d=0.06,volume=0.7[a0];"
    "[1:a]afade=t=out:st=0.12:d=0.06,volume=0.8[a1];"
    "[2:a]afade=t=out:st=0.15:d=0.07,volume=0.9[a2];"
    "[3:a]afade=t=out:st=0.30:d=0.25,volume=1.0[a3];"
    "[a0][a1][a2][a3]concat=n=4:v=0:a=1[out]",
    "-map", "[out]", "-ar", "44100", "-ac", "1", str(CHIME_PATH)
], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# Mensajes redactados con emoción, espíritu fitness, pasión y motivación de gimnasio
HIGH_ENERGY_ANNOUNCEMENTS = [
    {
        "id": "cierre-10min",
        "filename": "cierre-10min.mp3",
        "voice": "es-MX-DaliaNeural",
        "style": "cheerful",
        "styledegree": "2",
        "rate": "+12%",
        "pitch": "+5Hz",
        "display_text": (
            "¡Atención, guerreros! ¡Faltan solo diez minutos para cerrar el gimnasio! "
            "Vamos culminando esas últimas repeticiones con toda la fuerza y dejando las máquinas y mancuernas en su lugar. "
            "¡Muchísimas gracias por su entrega y por entrenar con nosotros hoy! ¡A darlo todo hasta el final!"
        ),
        "ssml": (
            "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='https://www.w3.org/2001/mstts' xml:lang='es-MX'>"
            "<voice name='es-MX-DaliaNeural'>"
            "<mstts:express-as style='cheerful' styledegree='2'>"
            "<prosody rate='+12%' pitch='+5Hz'>"
            "¡Atención, guerreros! <break time='250ms'/>"
            "¡Faltan solo diez minutos para cerrar el gimnasio! <break time='250ms'/>"
            "Vamos culminando esas últimas repeticiones con toda la fuerza y dejando las máquinas y mancuernas en perfecto orden. <break time='250ms'/>"
            "¡Muchísimas gracias por su entrega y por entrenar con nosotros hoy! <break time='150ms'/>"
            "¡A darlo todo hasta el final!"
            "</prosody>"
            "</mstts:express-as>"
            "</voice>"
            "</speak>"
        )
    },
    {
        "id": "orden-accesorios",
        "filename": "orden-accesorios.mp3",
        "voice": "es-MX-DaliaNeural",
        "style": "cheerful",
        "styledegree": "2",
        "rate": "+12%",
        "pitch": "+5Hz",
        "display_text": (
            "¡Familia Trankilandia! Recuerden que el orden es parte de la disciplina. "
            "Al terminar su rutina, por favor regresen cada mancuerna, barra y disco a su lugar. "
            "¡Cuidemos nuestra casa y entrenemos con todo el poder!"
        ),
        "ssml": (
            "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='https://www.w3.org/2001/mstts' xml:lang='es-MX'>"
            "<voice name='es-MX-DaliaNeural'>"
            "<mstts:express-as style='cheerful' styledegree='2'>"
            "<prosody rate='+12%' pitch='+5Hz'>"
            "¡Familia Trankilandia! <break time='200ms'/>"
            "Recuerden que el orden es parte fundamental de nuestra disciplina. <break time='200ms'/>"
            "Al terminar su rutina, por favor regresen cada mancuerna, barra y accesorio a su lugar. <break time='200ms'/>"
            "¡Cuidemos nuestra casa y entrenemos siempre con todo el poder!"
            "</prosody>"
            "</mstts:express-as>"
            "</voice>"
            "</speak>"
        )
    },
    {
        "id": "clases-grupales",
        "filename": "clases-grupales.mp3",
        "voice": "es-MX-DaliaNeural",
        "style": "excited",
        "styledegree": "2",
        "rate": "+14%",
        "pitch": "+6Hz",
        "display_text": (
            "¡Guerreros y guerreras! ¡Ya llegó nuestra profesora! "
            "Los esperamos a todos con la mejor vibra en el segundo piso para iniciar nuestras clases grupales con toda la energía. "
            "¡Suban ya y a darlo todo!"
        ),
        "ssml": (
            "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='https://www.w3.org/2001/mstts' xml:lang='es-MX'>"
            "<voice name='es-MX-DaliaNeural'>"
            "<mstts:express-as style='excited' styledegree='2'>"
            "<prosody rate='+14%' pitch='+6Hz'>"
            "¡Guerreros y guerreras! <break time='200ms'/>"
            "¡Ya llegó nuestra profesora! <break time='200ms'/>"
            "Los esperamos a todos con la mejor vibra en el segundo piso para iniciar nuestras clases grupales con toda la energía. <break time='200ms'/>"
            "¡Suban ya y a darlo todo!"
            "</prosody>"
            "</mstts:express-as>"
            "</voice>"
            "</speak>"
        )
    }
]

async def produce_broadcast_audio():
    for ann in HIGH_ENERGY_ANNOUNCEMENTS:
        print(f"\n==========================================")
        print(f"Produciendo audio enérgico: {ann['id']}")
        print(f"==========================================")

        raw_voice_mp3 = TEMP_DIR / f"{ann['id']}_raw.mp3"
        voice_wav = TEMP_DIR / f"{ann['id']}_voice.wav"
        music_bed_wav = TEMP_DIR / f"{ann['id']}_music.wav"
        final_mp3 = OUTPUT_DIR / ann["filename"]

        # 1. Sintetizar voz expresiva con SSML enérgico
        print(f"  [1/4] Sintetizando voz apasionada ({ann['voice']} - estilo {ann['style']})...")
        comm = edge_tts.Communicate(ann["ssml"], ann["voice"])
        await comm.save(str(raw_voice_mp3))

        # 2. Medir duración de la voz
        voice_dur = float(subprocess.check_output([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(raw_voice_mp3)
        ]).decode().strip())
        print(f"  [2/4] Duración de voz: {voice_dur:.2f}s")

        # 3. Procesar voz con ecualización de radio (presencia vocal y compresor de sala)
        #    Intro stinger (0.6s) + voz
        subprocess.run([
            "ffmpeg", "-y", "-i", str(raw_voice_mp3),
            "-af", "highpass=f=100,equalizer=f=250:width_type=o:w=1:g=2,equalizer=f=3500:width_type=o:w=1:g=3.5,acompressor=threshold=-14dB:ratio=4:attack=5:release=50",
            "-ar", "44100", "-ac", "1",
            str(voice_wav)
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # 4. Generar base musical fitness ducked de exactamente la duración requerida + 1.2s de cola
        total_broadcast_dur = voice_dur + 2.0
        print(f"  [3/4] Generando base rítmica fitness ducked ({total_broadcast_dur:.1f}s)...")
        generate_fitness_music_bed(music_bed_wav, total_broadcast_dur)

        # 5. Masterizar la mezcla final:
        #    - Pista 0: Stinger inicial (Ding armónico enérgico)
        #    - Pista 1: Base musical fitness a -18dB (subtle background drive)
        #    - Pista 2: Voz apasionada al frente con presencia (+1.5dB)
        print(f"  [4/4] Masterizando y ensamblando mezcla final de transmisión...")
        subprocess.run([
            "ffmpeg", "-y",
            "-i", str(CHIME_PATH),
            "-i", str(music_bed_wav),
            "-i", str(voice_wav),
            "-filter_complex",
            # Atrasar la voz 0.8s para que entre justo después del stinger con el beat
            "[2:a]adelay=850|850,volume=1.5[delayed_voice];"
            # Música a volumen de fondo (-18dB)
            "[1:a]volume=0.14[ducked_music];"
            # Stinger a volumen natural
            "[0:a]volume=0.9[stinger];"
            # Mezclar todas las capas
            "[stinger][ducked_music][delayed_voice]amix=inputs=3:duration=longest:dropout_transition=2[mixed];"
            # Compresor y limitador de masterización final
            "[mixed]alimiter=limit=0.95[out]",
            "-map", "[out]",
            "-c:a", "libmp3lame", "-b:a", "192k", "-ar", "44100",
            str(final_mp3)
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        final_dur = float(subprocess.check_output([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(final_mp3)
        ]).decode().strip())
        print(f"  ✓ Archivo creado con éxito: {ann['filename']} (Duración total: {final_dur:.1f}s)")

    # Limpiar temporales
    try:
        shutil.rmtree(TEMP_DIR)
    except Exception as e:
        print("Aviso:", e)

    print("\n¡Todos los audios de alta energía y producción fitness fueron creados exitosamente!")

if __name__ == "__main__":
    asyncio.run(produce_broadcast_audio())
