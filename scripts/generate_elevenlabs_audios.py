import urllib.request
import json
import os
import sys

API_KEY = os.environ.get("ELEVENLABS_API_KEY", "sk_7948798564db2ba5d6cf097d3896e09ce247e2797114db1f")

# Voice options:
# Laura: FGY2WhTYpPnrIDTdsKH5 (Enthusiast, upbeat, energetic)
# Sarah: EXAVITQu4vr4xnSDxMaL (Confident, expressive, natural)
# Jessica: cgSgspJ2msm6clMCkdW9 (Playful, bright, warm)

MESSAGES = [
    {
        "id": "cierre-10min",
        "voice_id": "FGY2WhTYpPnrIDTdsKH5", # Laura
        "text": "¡Atención, guerreros! Les recordamos que faltan diez minutos para cerrar el gimnasio. Por favor, vayan culminando sus rutinas y dejando las máquinas y mancuernas en orden para realizar el cierre a la hora establecida. ¡Muchas gracias por su comprensión y por entrenar con nosotros!",
        "filename": "public/sounds/anuncios/cierre-10min.mp3"
    },
    {
        "id": "orden-accesorios",
        "voice_id": "FGY2WhTYpPnrIDTdsKH5", # Laura
        "text": "¡Estimados guerreros! Recuerden devolver y guardar cada accesorio en su lugar después de utilizarlo. ¡El orden y la disciplina es responsabilidad de todos!",
        "filename": "public/sounds/anuncios/orden-accesorios.mp3"
    },
    {
        "id": "clases-grupales",
        "voice_id": "FGY2WhTYpPnrIDTdsKH5", # Laura
        "text": "¡Guerreros y guerreras! Ya llegó nuestra profesora. ¡Los esperamos a todos en el segundo piso para disfrutar de nuestras clases grupales!",
        "filename": "public/sounds/anuncios/clases-grupales.mp3"
    }
]

def synthesize_elevenlabs(voice_id, text, output_path):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.40,
            "similarity_boost": 0.80,
            "style": 0.35,
            "use_speaker_boost": True
        }
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "xi-api-key": API_KEY,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg"
        }
    )
    
    print(f"Generando con ElevenLabs: {output_path} ({len(text)} caracteres)...")
    with urllib.request.urlopen(req) as resp:
        audio_content = resp.read()
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(audio_content)
        print(f"Guardado exitosamente: {output_path} ({len(audio_content)} bytes)")

if __name__ == "__main__":
    for msg in MESSAGES:
        synthesize_elevenlabs(msg["voice_id"], msg["text"], msg["filename"])
