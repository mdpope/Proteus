// Disposable native probe only. Its anonymous outer job never affects the host
// owner. No token, account, machine policy, privilege or breakaway changes.
using System;
using System.IO;
using System.Text;
using System.Diagnostics;
using System.ComponentModel;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Web.Script.Serialization;

class WindowsTerminalNestingProbe
{
    [StructLayout(LayoutKind.Sequential)]
    struct Basic
    {
        public long ProcessTime, JobTime;
        public uint Flags;
        public UIntPtr Minimum, Maximum;
        public uint ActiveProcesses;
        public UIntPtr Affinity;
        public uint Priority, Scheduling;
    }
    [StructLayout(LayoutKind.Sequential)]
    struct Io { public ulong A, B, C, D, E, F; }
    [StructLayout(LayoutKind.Sequential)]
    struct Extended
    {
        public Basic Basic;
        public Io Io;
        public UIntPtr A, B, C, D;
    }
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern IntPtr CreateJobObject(IntPtr attributes, string name);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool SetInformationJobObject(IntPtr job, int kind, ref Extended value, uint size);
    [DllImport("kernel32.dll", EntryPoint = "SetInformationJobObject", SetLastError = true)]
    static extern bool SetUiRestrictions(IntPtr job, int kind, ref uint value, uint size);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool IsProcessInJob(IntPtr process, IntPtr job, out bool result);
    [DllImport("kernel32.dll")]
    static extern IntPtr GetCurrentProcess();
    [DllImport("kernel32.dll")]
    static extern bool CloseHandle(IntPtr handle);

    static string Quote(string value)
    {
        var result = new StringBuilder("\"");
        int slashes = 0;
        foreach (char c in value)
        {
            if (c == '\\') { slashes++; continue; }
            result.Append('\\', slashes * (c == '"' ? 2 : 1) + (c == '"' ? 1 : 0));
            result.Append(c);
            slashes = 0;
        }
        result.Append('\\', slashes * 2);
        result.Append('"');
        return result.ToString();
    }

    static int Main(string[] args)
    {
        // mode, helper, runtime, synthetic broker, result path.
        if (args.Length != 5) return 2;
        var json = new JavaScriptSerializer();
        var helper = Assembly.ReflectionOnlyLoadFrom(args[1]);
        bool inherited;
        if (!IsProcessInJob(GetCurrentProcess(), IntPtr.Zero, out inherited)) return 3;
        IntPtr job = IntPtr.Zero;
        string phase = "outer-job-setup";
        try
        {
            job = CreateJobObject(IntPtr.Zero, null);
            if (job == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error());
            var limits = new Extended();
            limits.Basic.Flags = 0x2000;
            if (!SetInformationJobObject(job, 9, ref limits, (uint)Marshal.SizeOf(typeof(Extended))))
                throw new Win32Exception(Marshal.GetLastWin32Error());
            if (args[0] == "restricted")
            {
                uint ui = 1; // JOB_OBJECT_UILIMIT_HANDLES on this owned job only.
                if (!SetUiRestrictions(job, 4, ref ui, 4))
                    throw new Win32Exception(Marshal.GetLastWin32Error());
            }
            if (!AssignProcessToJobObject(job, GetCurrentProcess()))
                throw new Win32Exception(Marshal.GetLastWin32Error());
            phase = "guardian";
            var start = new ProcessStartInfo(args[1], Quote(args[2]) + " " + Quote(args[3]));
            start.UseShellExecute = false;
            start.CreateNoWindow = true;
            start.RedirectStandardInput = true;
            start.RedirectStandardOutput = true;
            start.RedirectStandardError = true;
            start.StandardOutputEncoding = new UTF8Encoding(false);
            start.StandardErrorEncoding = new UTF8Encoding(false);
            start.EnvironmentVariables["ELECTRON_RUN_AS_NODE"] = "1";
            var guardian = Process.Start(start);
            string first = guardian.StandardOutput.ReadLine();
            var frame = json.DeserializeObject(first) as System.Collections.Generic.Dictionary<string, object>;
            if ((string)frame["t"] == "job-ready")
            {
                guardian.StandardInput.WriteLine("{\"t\":\"start\"}");
                guardian.StandardInput.Flush();
            }
            string remaining = guardian.StandardOutput.ReadToEnd();
            string errors = guardian.StandardError.ReadToEnd();
            guardian.WaitForExit();
            File.WriteAllText(args[4], json.Serialize(new {
                mode = args[0], phase, inheritedOuterJob = inherited,
                first, remaining, errors, guardianExitCode = guardian.ExitCode,
                imageRuntime = helper.ImageRuntimeVersion,
                references = Array.ConvertAll(helper.GetReferencedAssemblies(), value => value.FullName),
                actualClr = Environment.Version.ToString(), x64 = Environment.Is64BitProcess
            }));
            return 0;
        }
        catch (Exception error)
        {
            File.WriteAllText(args[4], json.Serialize(new {
                mode = args[0], phase, inheritedOuterJob = inherited,
                error = error.GetType().Name,
                win32 = error is Win32Exception ? ((Win32Exception)error).NativeErrorCode : 0
            }));
            return 1;
        }
        finally
        {
            // The probe belongs to this job, so closing it terminates the probe.
            if (job != IntPtr.Zero) CloseHandle(job);
        }
    }
}
