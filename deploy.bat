@echo off
git add .
git commit -m "feat: add countdown to Aug 15 launch"
git push
firebase deploy
