@echo off
echo ========================================================
echo   Iniciando Servidor Local - Talonario de Recibos
echo ========================================================
echo.
echo Abriendo aplicacion en el navegador...
echo Podras acceder desde esta PC y desde otros dispositivos en la misma red Wi-Fi.
echo.
start http://localhost:8080/
python -m http.server 8080
pause
