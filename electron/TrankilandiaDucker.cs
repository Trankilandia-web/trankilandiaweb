using System;
using System.IO;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Collections.Generic;
using System.Globalization;
using System.Threading;

namespace TrankilandiaAudio {
    class Program {
        [ComImport]
        [Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
        class MMDeviceEnumerator { }

        [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        interface IMMDeviceEnumerator {
            [PreserveSig] int EnumAudioEndpoints(int dataFlow, int dwStateMask, out IntPtr ppDevices);
            [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
        }

        [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        interface IMMDevice {
            [PreserveSig] int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, out IntPtr ppInterface);
        }

        [Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        interface IAudioSessionManager2 {
            [PreserveSig] int GetAudioSessionControl(ref Guid AudioSessionGuid, int StreamFlags, out IntPtr SessionControl);
            [PreserveSig] int GetSimpleAudioVolume(ref Guid AudioSessionGuid, int StreamFlags, out IntPtr AudioVolume);
            [PreserveSig] int GetSessionEnumerator(out IAudioSessionEnumerator SessionEnum);
        }

        [Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        interface IAudioSessionEnumerator {
            [PreserveSig] int GetCount(out int SessionCount);
            [PreserveSig] int GetSession(int SessionIndex, out IntPtr Session);
        }

        [Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        interface IAudioSessionControl2 {
            [PreserveSig] int GetState(out int pRetVal);
            [PreserveSig] int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
            [PreserveSig] int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
            [PreserveSig] int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
            [PreserveSig] int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
            [PreserveSig] int GetGroupingParam(out Guid pRetVal);
            [PreserveSig] int SetGroupingParam(ref Guid Override, ref Guid EventContext);
            [PreserveSig] int RegisterAudioSessionNotification(IntPtr NewNotifications);
            [PreserveSig] int UnregisterAudioSessionNotification(IntPtr NewNotifications);
            [PreserveSig] int GetSessionIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
            [PreserveSig] int GetSessionInstanceIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
            [PreserveSig] int GetProcessId(out uint pRetVal);
            [PreserveSig] int IsSystemSoundsSession();
            [PreserveSig] int SetDuckingPreference(bool optOut);
        }

        [Guid("87ce5498-68d6-44e5-9215-6da47ef883d8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        interface ISimpleAudioVolume {
            [PreserveSig] int SetMasterVolume(float fLevel, ref Guid EventContext);
            [PreserveSig] int GetMasterVolume(out float pfLevel);
            [PreserveSig] int SetMute(bool bMute, ref Guid EventContext);
            [PreserveSig] int GetMute(out bool pbMute);
        }

        static string StateFilePath {
            get { return Path.Combine(Path.GetTempPath(), "trankilandia_duck_state.txt"); }
        }

        static void Main(string[] args) {
            string command = args.Length > 0 ? args[0].ToLowerInvariant() : "duck";
            float duckLevel = 0.15f;
            HashSet<uint> excludePids = new HashSet<uint>();

            if (args.Length > 1) {
                float parsed;
                if (float.TryParse(args[1], NumberStyles.Float, CultureInfo.InvariantCulture, out parsed)) {
                    duckLevel = Math.Max(0.0f, Math.Min(1.0f, parsed));
                }
            }

            if (args.Length > 2) {
                string[] tokens = args[2].Split(new char[] { ',', ';', ' ', '|' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var t in tokens) {
                    uint p;
                    if (uint.TryParse(t.Trim(), out p)) {
                        excludePids.Add(p);
                    }
                }
            }

            bool hasMutex = false;
            Mutex mutex = null;
            try {
                try {
                    mutex = new Mutex(false, "Global\\TrankilandiaAudioDuckerMutex");
                    hasMutex = mutex.WaitOne(3000, false);
                } catch (AbandonedMutexException) {
                    hasMutex = true;
                } catch {
                    hasMutex = true;
                }

                if (command == "duck") {
                    DoDuck(duckLevel, excludePids);
                } else if (command == "restore" || command == "unduck") {
                    DoRestore(excludePids);
                } else if (command == "status") {
                    Console.WriteLine(File.Exists(StateFilePath) ? "DUCKED" : "NORMAL");
                }
            } catch (Exception ex) {
                Console.Error.WriteLine("Error: " + ex.Message);
            } finally {
                if (mutex != null) {
                    if (hasMutex) {
                        try { mutex.ReleaseMutex(); } catch {}
                    }
                    try { mutex.Close(); } catch {}
                }
            }
        }

        /// <summary>
        /// Determina con certeza total si una sesión de audio pertenece a Trankilandia Hub
        /// (proceso principal, renderizadores, audio service Chromium o subprocesos de Electron).
        /// </summary>
        static bool IsTrankilandiaProcess(uint pid, IAudioSessionControl2 ctrl, HashSet<uint> excludePids) {
            if (pid == 0) return true; // Sesión de sonidos de sistema de Windows, nunca atenuar

            if (excludePids != null && excludePids.Contains(pid)) return true;

            // 1. Verificar identificador de sesión WASAPI de Windows (contiene la ruta al .exe)
            try {
                string sessId;
                int hr = ctrl.GetSessionIdentifier(out sessId);
                if (hr == 0 && !string.IsNullOrEmpty(sessId)) {
                    string lowerId = sessId.ToLowerInvariant();
                    if (lowerId.Contains("trankilandia") || lowerId.Contains("electron")) {
                        return true;
                    }
                }
            } catch {}

            // 2. Verificar nombre del proceso en Windows (Trankilandia Hub, electron)
            try {
                using (Process proc = Process.GetProcessById((int)pid)) {
                    string name = proc.ProcessName.ToLowerInvariant();
                    if (name.Contains("trankilandia") || name == "electron") {
                        return true;
                    }
                    try {
                        string mainMod = proc.MainModule.FileName.ToLowerInvariant();
                        if (mainMod.Contains("trankilandia") || mainMod.Contains("electron")) {
                            return true;
                        }
                    } catch {}
                }
            } catch {}

            return false;
        }

        static void DoDuck(float duckLevel, HashSet<uint> excludePids) {
            Dictionary<uint, float> saved = new Dictionary<uint, float>();
            bool alreadyDucked = File.Exists(StateFilePath);

            if (alreadyDucked) {
                // Leer volumen original previo para no sobreescribir con valores ya atenuados
                try {
                    foreach (var line in File.ReadAllLines(StateFilePath)) {
                        var parts = line.Split(':');
                        if (parts.Length == 2) {
                            uint pid = uint.Parse(parts[0]);
                            float vol = float.Parse(parts[1], CultureInfo.InvariantCulture);
                            saved[pid] = vol;
                        }
                    }
                } catch {}
            }

            var enumerator = (IMMDeviceEnumerator)new MMDeviceEnumerator();
            IMMDevice dev;
            enumerator.GetDefaultAudioEndpoint(0, 0, out dev);
            if (dev == null) return;

            Guid iidMgr = new Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F");
            IntPtr pMgr;
            int hr = dev.Activate(ref iidMgr, 1, IntPtr.Zero, out pMgr);
            if (hr != 0 || pMgr == IntPtr.Zero) return;

            var mgr = (IAudioSessionManager2)Marshal.GetObjectForIUnknown(pMgr);
            IAudioSessionEnumerator sessionEnum;
            mgr.GetSessionEnumerator(out sessionEnum);
            if (sessionEnum == null) return;

            int count;
            sessionEnum.GetCount(out count);

            Guid IID_IAudioSessionControl2 = new Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d");
            Guid IID_ISimpleAudioVolume = new Guid("87ce5498-68d6-44e5-9215-6da47ef883d8");
            Guid emptyGuid = Guid.Empty;

            for (int i = 0; i < count; i++) {
                IntPtr pSession;
                sessionEnum.GetSession(i, out pSession);
                if (pSession != IntPtr.Zero) {
                    IntPtr pControl2;
                    Marshal.QueryInterface(pSession, ref IID_IAudioSessionControl2, out pControl2);
                    if (pControl2 != IntPtr.Zero) {
                        var ctrl = (IAudioSessionControl2)Marshal.GetObjectForIUnknown(pControl2);
                        uint pid;
                        ctrl.GetProcessId(out pid);

                        bool isTrankilandia = IsTrankilandiaProcess(pid, ctrl, excludePids);

                        if (isTrankilandia) {
                            // Trankilandia Hub: NUNCA atenuar. Asegurar volumen al 100% y desmutear
                            // para que los anuncios y micrófono NUNCA queden enmudecidos
                            IntPtr pVol;
                            Marshal.QueryInterface(pSession, ref IID_ISimpleAudioVolume, out pVol);
                            if (pVol != IntPtr.Zero) {
                                var simpleVol = (ISimpleAudioVolume)Marshal.GetObjectForIUnknown(pVol);
                                simpleVol.SetMasterVolume(1.0f, ref emptyGuid);
                                simpleVol.SetMute(false, ref emptyGuid);
                                Marshal.Release(pVol);
                            }
                        } else {
                            // Aplicación de música externa (YouTube, Spotify, navegador, etc.)
                            IntPtr pVol;
                            Marshal.QueryInterface(pSession, ref IID_ISimpleAudioVolume, out pVol);
                            if (pVol != IntPtr.Zero) {
                                var simpleVol = (ISimpleAudioVolume)Marshal.GetObjectForIUnknown(pVol);
                                float currentVol;
                                simpleVol.GetMasterVolume(out currentVol);

                                if (!saved.ContainsKey(pid)) {
                                    // Si el volumen actual ya está en o por debajo del duckLevel,
                                    // significa que ya estaba atenuado o bajo; guardar 1.0f para restaurar
                                    float originalVol = currentVol <= (duckLevel + 0.05f) ? 1.0f : currentVol;
                                    saved[pid] = originalVol;
                                }

                                simpleVol.SetMasterVolume(duckLevel, ref emptyGuid);
                                Marshal.Release(pVol);
                            }
                        }
                        Marshal.Release(pControl2);
                    }
                    Marshal.Release(pSession);
                }
            }
            Marshal.Release(pMgr);

            if (saved.Count > 0) {
                var lines = new List<string>();
                foreach (var kvp in saved) {
                    lines.Add(kvp.Key + ":" + kvp.Value.ToString("F3", CultureInfo.InvariantCulture));
                }
                try { File.WriteAllLines(StateFilePath, lines.ToArray()); } catch {}
            }

            Console.WriteLine("OK: DUCKED " + saved.Count + " sessions to " + (int)(duckLevel * 100) + "%");
        }

        static void DoRestore(HashSet<uint> excludePids) {
            Dictionary<uint, float> saved = new Dictionary<uint, float>();
            if (File.Exists(StateFilePath)) {
                try {
                    foreach (var line in File.ReadAllLines(StateFilePath)) {
                        var parts = line.Split(':');
                        if (parts.Length == 2) {
                            uint pid = uint.Parse(parts[0]);
                            float vol = float.Parse(parts[1], CultureInfo.InvariantCulture);
                            saved[pid] = vol;
                        }
                    }
                } catch {}
            }

            var enumerator = (IMMDeviceEnumerator)new MMDeviceEnumerator();
            IMMDevice dev;
            enumerator.GetDefaultAudioEndpoint(0, 0, out dev);
            if (dev == null) return;

            Guid iidMgr = new Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F");
            IntPtr pMgr;
            int hr = dev.Activate(ref iidMgr, 1, IntPtr.Zero, out pMgr);
            if (hr != 0 || pMgr == IntPtr.Zero) return;

            var mgr = (IAudioSessionManager2)Marshal.GetObjectForIUnknown(pMgr);
            IAudioSessionEnumerator sessionEnum;
            mgr.GetSessionEnumerator(out sessionEnum);
            if (sessionEnum == null) return;

            int count;
            sessionEnum.GetCount(out count);

            Guid IID_IAudioSessionControl2 = new Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d");
            Guid IID_ISimpleAudioVolume = new Guid("87ce5498-68d6-44e5-9215-6da47ef883d8");
            Guid emptyGuid = Guid.Empty;

            for (int i = 0; i < count; i++) {
                IntPtr pSession;
                sessionEnum.GetSession(i, out pSession);
                if (pSession != IntPtr.Zero) {
                    IntPtr pControl2;
                    Marshal.QueryInterface(pSession, ref IID_IAudioSessionControl2, out pControl2);
                    if (pControl2 != IntPtr.Zero) {
                        var ctrl = (IAudioSessionControl2)Marshal.GetObjectForIUnknown(pControl2);
                        uint pid;
                        ctrl.GetProcessId(out pid);

                        bool isTrankilandia = IsTrankilandiaProcess(pid, ctrl, excludePids);

                        if (isTrankilandia) {
                            // Asegurar que Trankilandia Hub esté siempre en 100% de volumen
                            IntPtr pVol;
                            Marshal.QueryInterface(pSession, ref IID_ISimpleAudioVolume, out pVol);
                            if (pVol != IntPtr.Zero) {
                                var simpleVol = (ISimpleAudioVolume)Marshal.GetObjectForIUnknown(pVol);
                                simpleVol.SetMasterVolume(1.0f, ref emptyGuid);
                                simpleVol.SetMute(false, ref emptyGuid);
                                Marshal.Release(pVol);
                            }
                        } else if (saved.ContainsKey(pid)) {
                            // Restaurar volumen original previo de la aplicación externa
                            IntPtr pVol;
                            Marshal.QueryInterface(pSession, ref IID_ISimpleAudioVolume, out pVol);
                            if (pVol != IntPtr.Zero) {
                                var simpleVol = (ISimpleAudioVolume)Marshal.GetObjectForIUnknown(pVol);
                                float originalVol = saved[pid];
                                simpleVol.SetMasterVolume(originalVol, ref emptyGuid);
                                Marshal.Release(pVol);
                            }
                        }
                        Marshal.Release(pControl2);
                    }
                    Marshal.Release(pSession);
                }
            }
            Marshal.Release(pMgr);

            try { File.Delete(StateFilePath); } catch {}
            Console.WriteLine("OK: RESTORED " + saved.Count + " sessions");
        }
    }
}
