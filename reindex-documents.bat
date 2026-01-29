@echo off
REM Script pour réindexer les documents RAG
REM Ce script lit tous les fichiers .txt dans backend1/documents/ et crée les embeddings

echo ========================================
echo Réindexation des documents RAG
echo ========================================
echo.

REM Chemin vers PHP (ajustez si nécessaire)
set PHP_PATH=C:\wamp64\bin\php\php7.4.9\php.exe

REM Vérifier si PHP existe
if not exist "%PHP_PATH%" (
    echo ERREUR: PHP introuvable à %PHP_PATH%
    echo Veuillez ajuster le chemin dans ce script.
    pause
    exit /b 1
)

echo Lancement de l'importation...
echo.

"%PHP_PATH%" backend1\rag\import.php

echo.
echo ========================================
echo Importation terminée!
echo ========================================
pause
