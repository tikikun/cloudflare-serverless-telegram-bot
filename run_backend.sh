#!/bin/zsh


if tmux has-session 2>/dev/null; then
  tmux kill-server
  echo "tmux server killed"
  sleep 1 # wait for tmux server to shut down
else
  echo "no running tmux server found"
fi


tmux new -d -s dominic_backend "cd dominic_backend && npm run start"

tmux new -d -s aria-rpc "aria2c --conf-path=aria2c_service/aria2.conf"

#tmux attach-session -t dominic_backend

#tmux new -d -s aria-webui "cd /Users/daotuanhome/Documents/codes/webui-aria2 && node node-server.js"
