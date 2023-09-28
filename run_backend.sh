#!/bin/zsh

# Check if aria2.conf already has dir specified
if grep -q "^dir=" aria2c_service/aria2.conf; then
  echo "dir already specified in aria2.conf"
else
  # Extract the value of filesRoot from backend_config.json
  filesRoot=$(sed -e 's/[{}]/''/g' backend_config.json | awk -v RS=',' -F: '/filesRoot/ {print $2}' | tr -d '"' | tr -d ' ')

  # Create dir path using filesRoot value
  dir="${filesRoot}"

  # Add dir and RPC configuration to aria2.conf
  echo "# Global Configuration" >aria2c_service/aria2.conf
  echo "dir=${dir}" >>aria2c_service/aria2.conf
  echo "" >>aria2c_service/aria2.conf
  echo "# RPC Configuration" >>aria2c_service/aria2.conf
  echo "enable-rpc=true" >>aria2c_service/aria2.conf
  echo "rpc-listen-all=true" >>aria2c_service/aria2.conf
  echo "on-download-complete=aria2c_service/noti-service.sh" >>aria2c_service/aria2.conf
  echo "on-bt-download-complete=aria2c_service/noti-service.sh" >>aria2c_service/aria2.conf

  echo "dir added to aria2.conf: ${dir}"
fi

# Begin server
if tmux has-session 2>/dev/null; then
  tmux kill-server
  echo "tmux server killed"
  echo "wait for tmux server to shut down and restart (1 second)"
  sleep 1 # wait for tmux server to shut down
else
  echo "no running tmux server found"
fi

tmux new -d -s dominic_backend "cd dominic_backend && npm run start"

tmux new -d -s aria-rpc "LC_MESSAGES="C" aria2c --conf-path=aria2c_service/aria2.conf"

tmux new -d -s filebrowser "/opt/homebrew/bin/filebrowser -a 0.0.0.0 -r /Volumes/Tuandisk"

echo "Aria2 server and dominic_backend started"
