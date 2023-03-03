## How to use

1. Remember to specify the specific path in `noti-service.sh` | also the working_path as well (I should merge the two in the future).
   *Note: It should have been refactored to use an environment variable.*
2. Remember to run `chmod +x noti-service.sh` to make it executable for the `aria2c` client.
3. How to run aria2c server with telegram message on mac 
   ```shell
   aria2c --enable-rpc --rpc-listen-all --on-download-complete='path/to/service/noti-service.sh
   ```