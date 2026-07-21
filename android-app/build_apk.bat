@echo off
set JAVA_HOME=C:\Users\PC\.bubblewrap\jdk17\jdk-17.0.19+10
set PATH=%JAVA_HOME%\bin;%PATH%
echo Building APK with Java %JAVA_HOME%...
call gradlew.bat assembleDebug
echo BUILD_DONE
