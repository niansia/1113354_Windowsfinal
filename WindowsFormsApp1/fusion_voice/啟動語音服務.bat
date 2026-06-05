@echo off
chcp 65001 >nul
title Fusion 語音服務
cd /d "%~dp0"
python bootstrap_voice.py
if errorlevel 1 pause
