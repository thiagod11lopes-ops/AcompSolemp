@echo off
REM Publica regras Firestore no projeto acompsolemp (requer: npx firebase-tools login)
cd /d "%~dp0.."
npx --yes firebase-tools deploy --only firestore:rules --project acompsolemp
pause
