using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

[assembly: AssemblyTitle("SintAklat-sanayan")]
[assembly: AssemblyDescription("SintAklat-sanayan - Interaktibong Aklat at Sanayan sa Filipino (Baitang 7-10)")]
[assembly: AssemblyCompany("SintAklat-sanayan")]
[assembly: AssemblyProduct("SintAklat-sanayan Desktop")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

namespace SintAklatSanayan
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            try
            {
                string exeDir = AppDomain.CurrentDomain.BaseDirectory;
                string localIndex = Path.Combine(exeDir, "index.html");
                string targetIndex = localIndex;

                // If index.html is not beside the .exe, extract embedded resources to LocalAppData
                if (!File.Exists(localIndex))
                {
                    string appDataDir = Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                        "SintAklat-sanayan",
                        "app"
                    );

                    ExtractEmbeddedResource("index.html", Path.Combine(appDataDir, "index.html"));
                    ExtractEmbeddedResource("style.css", Path.Combine(appDataDir, "css", "style.css"));
                    ExtractEmbeddedResource("app.js", Path.Combine(appDataDir, "js", "app.js"));
                    ExtractEmbeddedResource("modules_data.js", Path.Combine(appDataDir, "js", "modules_data.js"));

                    targetIndex = Path.Combine(appDataDir, "index.html");
                }

                string fileUri = new Uri(targetIndex).AbsoluteUri;
                string browserPath = FindChromiumBrowser();

                if (!string.IsNullOrEmpty(browserPath))
                {
                    string profileDir = Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                        "SintAklat-sanayan",
                        "window-profile"
                    );

                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = browserPath,
                        Arguments = string.Format("--app=\"{0}\" --user-data-dir=\"{1}\" --start-maximized", fileUri, profileDir),
                        UseShellExecute = false
                    };
                    Process.Start(psi);
                }
                else
                {
                    // Fallback to default browser
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = targetIndex,
                        UseShellExecute = true
                    });
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Hindi mabuksan ang SintAklat-sanayan:\n" + ex.Message,
                    "SintAklat-sanayan",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private static void ExtractEmbeddedResource(string resourceName, string outputPath)
        {
            string dir = Path.GetDirectoryName(outputPath);
            if (!Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            Assembly asm = Assembly.GetExecutingAssembly();
            using (Stream stream = asm.GetManifestResourceStream(resourceName))
            {
                if (stream == null) return;
                using (FileStream fs = new FileStream(outputPath, FileMode.Create, FileAccess.Write))
                {
                    stream.CopyTo(fs);
                }
            }
        }

        private static string FindChromiumBrowser()
        {
            string[] candidates = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe")
            };

            foreach (string path in candidates)
            {
                if (File.Exists(path))
                {
                    return path;
                }
            }

            return null;
        }
    }
}
