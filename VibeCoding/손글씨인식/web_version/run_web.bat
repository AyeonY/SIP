@echo off
chcp 65001 > nul
title 손글씨 숫자 인식 웹버전 서버
echo 웹 서버 패키지 설치 체크 중...
python -m pip install -r ..\requirements.txt
echo.
echo 서버 실행 후 웹 브라우저에서 http://localhost:8000 으로 접속하세요.
python app.py
pause