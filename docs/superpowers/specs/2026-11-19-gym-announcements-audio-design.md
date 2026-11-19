# Diseño del Sistema de Anuncios y Mensajes de Audio para Trankilandia Gym

- **Fecha:** 19 de Noviembre de 2026
- **Estado:** Aprobado para Implementación
- **Autor:** Antigravity / Trankilandia Gym Dev Team
- **Objetivo:** Reproducir 3 mensajes oficiales de megafonía pregrabados a través del parlante Bluetooth del gimnasio, mediante un control accesible y no invasivo en la interfaz (`PortalHeader`).

---

## 1. Contexto y Requerimientos

La administración de Trankilandia Gym (Marisol Flores) requiere emitir 3 mensajes clave por el sistema de sonido del gimnasio:

1. **Aviso de Cierre (10 minutos):**
   > *"ATENCIÓN, GUERREROS. Les recordamos que faltan 10 minutos para cerrar el gimnasio. Por favor, vayan culminando sus rutinas y dejando las máquinas en orden para realizar el cierre a la hora establecida. ¡Gracias por su comprensión y por entrenar con nosotros!"*

2. **Aviso de Orden y Accesorios:**
   > *"Estimados guerreros, recuerden devolver y guardar cada accesorio en su lugar después de utilizarlo. ¡El orden es responsabilidad de todos!"*

3. **Aviso de Clases Grupales:**
   > *"¡Guerreros! Ya llegó nuestra profesora. ¡Los esperamos en el segundo piso para disfrutar de nuestras clases grupales!"*

### Restricciones Técnicas y de Diseño
- **No distorsionar la UI/UX:** El diseño debe integrarse de forma natural en `PortalHeader.tsx` sin empujar componentes, sin desfasar el grid de Caja ni de Recepción.
- **Formato de Audio:** Archivos MP3 fijos pregrabados en la carpeta de sonidos públicos (`public/sounds/anuncios/`), acompañados de un jingle de campana inicial (Ding-Dong) para captar la atención de los atletas en sala.
- **Salida de Audio:** Transmisión al parlante Bluetooth conectado (dispositivo de audio predeterminado de Windows / Electron).
- **Integración con Sistema de Volumen:** El volumen de reproducción debe respetar el control maestro existente (`getAlertVolume` y `isAlertMuted`).
- **Entrega Final:** Compilación del nuevo instalador ejecutable de Windows (`dist-electron/Trankilandia Hub Setup 1.0.0.exe`).

---

## 2. Arquitectura de la Solución

### 2.1. Archivos de Audio (`public/sounds/anuncios/`)
Se generarán 3 archivos MP3 de alta fidelidad con entonación clara en español, precedidos por un tono armónico de atención:
1. `cierre-10min.mp3`
2. `orden-accesorios.mp3`
3. `clases-grupales.mp3`

### 2.2. Capa Lógica y Servicio de Reproducción (`src/lib/announcementsService.ts`)
Módulo encargado de:
- Lista tipada de anuncios con título, badge temático, texto completo y ruta del archivo MP3.
- `playAnnouncement(id: string)`: Instancia y reproduce el archivo HTML5 Audio, aplicando el volumen maestro de `audioVoiceAlerts`. Si ya hay un audio reproduciéndose, lo cancela antes de iniciar el nuevo.
- `stopAnnouncement()`: Detiene la reproducción en curso inmediatamente.
- `getPlayingAnnouncementId()`: Retorna el ID del anuncio activo o `null`.
- `isAnnouncementPlaying()`: Retorna booleano de estado.
- Disparo de evento global de ventana `gym-announcement-state-changed` para reactividad en los componentes.
- **Fallback Automático:** Si el archivo de audio presentara algún error de carga, recurre de forma transparente a `speakGymAnnouncement` (Web Speech API).

### 2.3. Componente de Interfaz (`src/components/portal/GymAnnouncementsControl.tsx`)
- **Botón Disparador:**
  - Etiqueta: `Mensajes` (con ícono `Volume2` o `Megaphone`). En resoluciones móviles se compacta automáticamente a solo ícono para no desbordar la cabecera.
  - Estilo: Idéntico a los botones existentes en `PortalHeader` (`bg-zinc-900`, `border-white/10`, `hover:border-amber-400`).
  - Animación sutil de ondas / pulso ámbar cuando algún mensaje está reproduciéndose.
- **Panel Desplegable (Popover):**
  - Posicionamiento absoluto flotante (`z-50`, no empuja la interfaz).
  - Cabecera: *"Mensajes y Anuncios · Parlante Bluetooth"* con botón rojo de "Detener Todo" si hay audio activo.
  - 3 Tarjetas interactivas para cada anuncio:
    - Badge temático (Cierre, Disciplina, Clases).
    - Título y extracto legible del mensaje.
    - Botón de Reproducir/Pausar individual con indicador de estado (onda sonora o spinner de reproducción).
  - Pie informativo con indicador de volumen actual sincronizado.

### 2.4. Integración en `PortalHeader.tsx`
Se inserta `<GymAnnouncementsControl />` de forma limpia junto a `<GymMegaphoneControl />` y `<AlertVolumeControl />`.

---

## 3. Plan de Verificación y Compilación
1. **Pruebas Unitarias:** Crear `src/tests/unit/announcementsService.test.ts` para verificar la reproducción, parada, sincronización de volumen y eventos.
2. **Generación de Audios MP3:** Crear script generador y verificar que los archivos existan y se reproduzcan correctamente en `public/sounds/anuncios/`.
3. **Suite Completa de Tests:** Ejecutar `npm test` asegurando que los 108 tests existentes sigan en verde.
4. **Build de Producción y Electron:** Ejecutar `npm run electron:build` para validar TypeScript, empaquetar Vite y compilar el instalador `.exe` en `dist-electron/`.
