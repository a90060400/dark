@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 -c "import pynput" 1>nul 2>nul || py -3 -m pip install -r requirements.txt
  py -3 app.py
  goto :eof
)
python -c "import pynput" 1>nul 2>nul || python -m pip install -r requirements.txt
python app.py
