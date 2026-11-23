using System;
using System.IO;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Collections.Generic;
using System.Globalization;

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
            uint excludePid = 0;

            if (args.Length > 1) {
                float parsed;
                if (float.TryParse(args[1], NumberStyles.Float, CultureInfo.InvariantCulture, out parsed)) {
                    duckLevel = Math.Max(0.0f, Math.Min(1.0f, parsed));
                }
            }

            if (args.Length > 2) {
                uint p;
                if (uint.TryParse(args[2], out p)) {
                    excludePid = p;
                }
            }

            try {
                if (command == "duck") {
                    DoDuck(duckLevel, excludePid);
                } else if (command == "restore" || command == "unduck") {
                    DoRestore();
                } else if (command == "status") {
                    Console.WriteLine(File.Exists(StateFilePath) ? "DUCKED" : "NORMAL");
                }
            } catch (Exception ex) {
                Console.Error.WriteLine("Error: " + ex.Message);
            }
        }

        static void DoDuck(float duckLevel, uint excludePid) {
            Dictionary<uint, float> saved = new Dictionary<uint, float>();
            bool alreadyDucked = File.Exists(StateFilePath);

            if (alreadyDucked) {
                // Read existing state to not overwrite original volumes
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

                        // Don't duck excluded process (Trankilandia) or system (0)
                        if (pid != excludePid && pid != 0) {
                            IntPtr pVol;
                            Marshal.QueryInterface(pSession, ref IID_ISimpleAudioVolume, out pVol);
                            if (pVol != IntPtr.Zero) {
                                var simpleVol = (ISimpleAudioVolume)Marshal.GetObjectForIUnknown(pVol);
                                float currentVol;
                                simpleVol.GetMasterVolume(out currentVol);

                                if (!alreadyDucked && !saved.ContainsKey(pid)) {
                                    saved[pid] = currentVol;
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

            if (!alreadyDucked && saved.Count > 0) {
                var lines = new List<string>();
                foreach (var kvp in saved) {
                    lines.Add(kvp.Key + ":" + kvp.Value.ToString("F3", CultureInfo.InvariantCulture));
                }
                File.WriteAllLines(StateFilePath, lines.ToArray());
            }

            Console.WriteLine("OK: DUCKED " + saved.Count + " sessions to " + (int)(duckLevel * 100) + "%");
        }

        static void DoRestore() {
            if (!File.Exists(StateFilePath)) {
                Console.WriteLine("OK: NOT_DUCKED");
                return;
            }

            Dictionary<uint, float> saved = new Dictionary<uint, float>();
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

                        if (saved.ContainsKey(pid)) {
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
