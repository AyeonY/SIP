@echo off
chcp 65001 > nul
title 손글씨 숫자 인식 프로그램
echo 의존성 패키지 체크 중...
python -m pip install -r ..\requirements.txt
echo.
echo 파이썬 프로그램을 실행합니다...
python digit_recognition.py
pause