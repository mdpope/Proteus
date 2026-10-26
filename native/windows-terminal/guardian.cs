// No user command or environment is accepted on argv. Compile with the existing
// Windows .NET Framework compiler; ship the resulting exact hashed x64 asset.
using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.ComponentModel;
using System.Web.Script.Serialization;
using System.Collections.Generic;
class Guardian {
 const int MaxFrame=524288;
 [StructLayout(LayoutKind.Sequential)] struct Basic { public long PerProcessUserTimeLimit,PerJobUserTimeLimit; public uint LimitFlags; public UIntPtr MinimumWorkingSetSize,MaximumWorkingSetSize; public uint ActiveProcessLimit; public UIntPtr Affinity; public uint PriorityClass,SchedulingClass; }
 [StructLayout(LayoutKind.Sequential)] struct Io {public ulong ReadOperationCount,WriteOperationCount,OtherOperationCount,ReadTransferCount,WriteTransferCount,OtherTransferCount;}
 [StructLayout(LayoutKind.Sequential)] struct Extended {public Basic BasicLimitInformation;public Io IoInfo;public UIntPtr ProcessMemoryLimit,JobMemoryLimit,PeakProcessMemoryUsed,PeakJobMemoryUsed;}
 [DllImport("kernel32.dll",SetLastError=true,CharSet=CharSet.Unicode)] static extern IntPtr CreateJobObject(IntPtr attributes,string name);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job,int info,ref Extended value,uint size);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
 [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetHandleInformation(IntPtr handle,out uint flags);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool CloseHandle(IntPtr handle);
 static IntPtr job=IntPtr.Zero;static Process broker;static readonly object outputLock=new object(),inputLock=new object();static readonly ManualResetEvent stop=new ManualResetEvent(false);static int stopping=0;
 static JavaScriptSerializer Json(){var s=new JavaScriptSerializer();s.MaxJsonLength=MaxFrame;return s;}
 static void Send(object value){SendLine(Json().Serialize(value));}
 static void SendLine(string line){if(Encoding.UTF8.GetByteCount(line)>MaxFrame)throw new InvalidDataException("Frame exceeds limit");lock(outputLock){Console.Out.WriteLine(line);Console.Out.Flush();}}
 static string ReadFrame(TextReader reader){var b=new StringBuilder();int c;while((c=reader.Read())!=-1){if(c==10){var line=b.ToString();if(Encoding.UTF8.GetByteCount(line)>MaxFrame)throw new InvalidDataException("Frame exceeds limit");return line;}if(c==13)continue;if(b.Length>=MaxFrame)throw new InvalidDataException("Frame exceeds limit");b.Append((char)c);}if(b.Length!=0)throw new InvalidDataException("Partial frame");return null;}
 static Dictionary<string,object> Parse(string line){var value=Json().DeserializeObject(line) as Dictionary<string,object>;if(value==null||!value.ContainsKey("t")||!(value["t"] is string))throw new InvalidDataException("Invalid frame");return value;}
 static string Quote(string value){var b=new StringBuilder("\"");int slashes=0;foreach(char c in value){if(c=='\\'){slashes++;continue;}if(c=='"'){b.Append('\\',slashes*2+1);b.Append(c);}else{b.Append('\\',slashes);b.Append(c);}slashes=0;}b.Append('\\',slashes*2);b.Append('"');return b.ToString();}
 static void RequestStop(){if(Interlocked.Exchange(ref stopping,1)==0)stop.Set();}
 static void ParentLoop(){try{string line;while((line=ReadFrame(Console.In))!=null){var frame=Parse(line);if((string)frame["t"]=="close"){RequestStop();return;}lock(inputLock){broker.StandardInput.WriteLine(line);broker.StandardInput.Flush();}}}catch{ }finally{RequestStop();}}
 static void BrokerLoop(){try{string line;while((line=ReadFrame(broker.StandardOutput))!=null){var frame=Parse(line);SendLine(line);if((string)frame["t"]=="exit"||(string)frame["t"]=="error"){RequestStop();return;}}}catch{try{Send(new {t="error",code="broker-protocol-failed"});}catch{}}finally{RequestStop();}}
 static void StderrLoop(){try{char[] buffer=new char[2048];int n;while((n=broker.StandardError.Read(buffer,0,buffer.Length))>0){Console.Error.Write(buffer,0,n);Console.Error.Flush();}}catch{RequestStop();}}
 static int Main(string[] args){Console.InputEncoding=new UTF8Encoding(false);Console.OutputEncoding=new UTF8Encoding(false);bool ready=false;try{
 bool invalidInfo=false;
 #if TEST_JOB_FAILURE
 if(args.Length==3&&args[2]=="--test-invalid-job-info")invalidInfo=true;
 #endif
 if(args.Length!=(invalidInfo?3:2)||!Path.IsPathRooted(args[0])||!Path.IsPathRooted(args[1])||!File.Exists(args[0])||!File.Exists(args[1]))throw new InvalidDataException("Invalid broker assets");
 job=CreateJobObject(IntPtr.Zero,null);if(job==IntPtr.Zero)throw new Win32Exception(Marshal.GetLastWin32Error());
 var limits=new Extended();limits.BasicLimitInformation.LimitFlags=0x2000; // KILL_ON_JOB_CLOSE, no breakaway flags.
 if(!SetInformationJobObject(job,invalidInfo?0:9,ref limits,(uint)Marshal.SizeOf(typeof(Extended))))throw new Win32Exception(Marshal.GetLastWin32Error());
 uint flags;if(!GetHandleInformation(job,out flags)||(flags&1)!=0)throw new InvalidDataException("Job handle is inheritable");
 // Assign our pseudo handle before a broker or any user-command process exists.
 if(!AssignProcessToJobObject(job,GetCurrentProcess()))throw new Win32Exception(Marshal.GetLastWin32Error());
 ready=true;Send(new {t="job-ready",nonInheritable=true,killOnClose=true});
 string config=ReadFrame(Console.In);if(config==null)return 0;if((string)Parse(config)["t"]!="start")throw new InvalidDataException("Expected start frame");
 var info=new ProcessStartInfo(args[0],Quote(args[1]));info.UseShellExecute=false;info.CreateNoWindow=true;info.RedirectStandardInput=true;info.RedirectStandardOutput=true;info.RedirectStandardError=true;info.StandardOutputEncoding=new UTF8Encoding(false);info.StandardErrorEncoding=new UTF8Encoding(false);info.EnvironmentVariables["ELECTRON_RUN_AS_NODE"]="1";
 broker=Process.Start(info);lock(inputLock){broker.StandardInput.WriteLine(config);broker.StandardInput.Flush();}
 new Thread(ParentLoop){IsBackground=true}.Start();new Thread(BrokerLoop){IsBackground=true}.Start();new Thread(StderrLoop){IsBackground=true}.Start();stop.WaitOne();return 0;
 }catch(Exception e){try{Send(new {t="error",code=ready?"guardian-start-failed":"job-setup-failed",win32=e is Win32Exception?((Win32Exception)e).NativeErrorCode:0});}catch{}return 1;}
 finally{ // Closing this sole noninheritable handle terminates this guardian too.
 if(job!=IntPtr.Zero){CloseHandle(job);job=IntPtr.Zero;}
 }}
}
