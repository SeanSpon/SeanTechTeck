"""
SeeZee Agent Hidden Launcher (Windows)
Creates a hidden .exe file that starts the agent without showing a console window.

Usage:
  python windows/create_exe_launcher.py

This will create: SeeZee-Agent-Launcher.exe
Place it in shell:startup to auto-run on login, or use the scheduled task.
"""

import os
import sys
import subprocess
from pathlib import Path

def create_launcher_exe():
    """Create a hidden launcher exe using PyInstaller"""
    
    repo_root = Path(__file__).parent.parent
    output_dir = repo_root / "windows" / "dist"
    
    print("🚀 Creating SeeZee Agent Launcher EXE...")
    print(f"   Repository: {repo_root}")
    print(f"   Output: {output_dir}")
    
    # Check if PyInstaller is installed
    try:
        import PyInstaller
    except ImportError:
        print("\n❌ PyInstaller not found. Installing...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)
    
    # Create the wrapper script
    wrapper_script = repo_root / "windows" / "_agent_launcher_wrapper.py"
    wrapper_content = f'''#!/usr/bin/env python3
"""Hidden wrapper to launch SeeZee Agent"""
import subprocess
import sys
from pathlib import Path

repo_root = Path(r"{repo_root}")
launcher_bat = repo_root / "windows" / "seezee-agent-launcher.bat"

# Launch the batch file which handles Python detection
subprocess.Popen(
    [str(launcher_bat)],
    cwd=str(repo_root),
    creationflags=0x08000000,  # CREATE_NO_WINDOW
    shell=False
)
'''
    
    with open(wrapper_script, "w") as f:
        f.write(wrapper_content)
    print(f"\n✅ Created wrapper: {wrapper_script}")
    
    # Run PyInstaller
    cmd = [
        sys.executable,
        "-m", "PyInstaller",
        "--onefile",                          # Single executable
        "--windowed",                         # No console window
        "--icon=NONE",                        # No icon (minimal size)
        f"--distpath={output_dir}",           # Output directory
        f"--workpath={repo_root / 'windows' / 'build'}",
        f"--specpath={repo_root / 'windows'}",
        "--name=SeeZee-Agent-Launcher",
        str(wrapper_script)
    ]
    
    print(f"\n🔨 Running PyInstaller...")
    print(f"   Command: {' '.join(cmd)}\n")
    
    try:
        subprocess.run(cmd, check=True)
        exe_path = output_dir / "SeeZee-Agent-Launcher.exe"
        
        if exe_path.exists():
            print(f"\n✅ SUCCESS! Created: {exe_path}")
            print(f"\n📌 Next steps:")
            print(f"   1. Copy to startup folder:")
            print(f"      shell:startup")
            print(f"   2. Or create scheduled task (requires admin):")
            print(f"      Set-ExecutionPolicy -Scope CurrentUser RemoteSigned")
            print(f"      .\\windows\\install-seezee-agent-task.ps1")
            print(f"\n   The agent will run on port 5050")
            return True
        else:
            print(f"\n❌ Failed: EXE not found at {exe_path}")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"\n❌ PyInstaller failed: {e}")
        return False

if __name__ == "__main__":
    success = create_launcher_exe()
    sys.exit(0 if success else 1)
