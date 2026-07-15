#!/bin/zsh
cd "${0:A:h}"
python3 -m http.server 8765 >/tmp/british-ear-server.log 2>&1 &
SERVER_PID=$!
sleep 1
open "http://localhost:8765"
echo "British Ear 已打开。关闭此窗口即可停止本地网站。"
trap 'kill $SERVER_PID 2>/dev/null' EXIT INT TERM
wait $SERVER_PID
