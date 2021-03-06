import net from 'net';
import _ from 'lodash';
import { errorFromCode } from 'appium-base-driver';
import log from './logger';


const COMMAND_TYPES = {
  ACTION: 'action',
  SHUTDOWN: 'shutdown'
};

class SocketBootstrap {
  constructor (opts) {
    this.opts = opts;
    this.ignoreUnexpectedShutdown = true;
  }

  async start () {
    await this.init();
    await this.connectSocket();
  }

  async shutDown () {
    if (this.socketClient) {
      await this.sendAction("appDisconnect");
    }
  }

  async connectSocket () {
    log.debug(`connectSocket ${this.opts.deviceName}:${this.opts.systemPort}`);
    try {
      return await new Promise((resolve, reject) => {
        try {
          if (!this.socketClient) {
            this.socketClient = net.connect(this.opts.systemPort, this.opts.deviceName);
            this.socketClient.setEncoding('utf8');
            this.socketClient.on('error', (err) => {
              if (!this.ignoreUnexpectedShutdown) {
                throw new Error(`Bootstrap socket shutdown: ${err}`);
              } else {
                this.socketClient.destroy();
                this.socketClient = null;
                reject(err);
              }
            });
            this.socketClient.once('connect', () => {
              log.info("Bootstrap socket is now connected");
              this.sendAction("initialize");
              resolve();
            });
          } else {
            log.info("SocketClient already Created");
            resolve();
          }
        } catch (err) {
          reject(err);
        }
      });
    } catch (err) {
      log.errorAndThrow(`Error occured while reconnection. Original error: ${err}`);
    }
  }

  async sendCommand (type, extra = {}) {
    if (!this.socketClient) {
      await this.connectSocket();
    }

    return await new Promise((resolve, reject) => {
      let cmd = Object.assign({ cmd: type }, extra);
      let cmdJson = `${JSON.stringify(cmd)} \n`;
      let streamData = '';
      log.debug(`Sending command to device: ${cmdJson} with timeout ${this.opts.socketTimeout}`);

      try {
        this.socketClient.removeAllListeners('timeout');
        this.socketClient.removeAllListeners('end');
        this.socketClient.write(cmdJson);
        this.socketClient.on('data', (data) => {
          log.debug("Received command result from bootstrap : "+data);
          try {
            streamData = JSON.parse(streamData + data);
            this.socketClient.removeAllListeners('data');
            if (streamData.status === 0) {
              resolve(streamData.value);
            }
            reject(errorFromCode(streamData.status));
          } catch (ign) {
            log.debug("Stream still not complete, waiting");
            streamData += data;
          }
        });
        if (this.opts.socketTimeout) {
          this.socketClient.setTimeout(this.opts.socketTimeout);
          this.socketClient.on('timeout', () => {
            this.socketClient.destroy();
            this.socketClient = null;
            this.isRestartApp = true;
            reject(errorFromCode(-1, "No response from Server"));
          });
        }
        this.socketClient.on('end', () => {
          this.socketClient.destroy();
          this.socketClient = null;
          this.isRestartApp = true;
          reject(errorFromCode(-1, "Socket ended by Server"));
        });
      } catch (err) {
        reject(errorFromCode(-1, err));
      }
    });
  }

  async sendAction (action, params = {}) {
    let extra = { action, params };
    return await this.sendCommand(COMMAND_TYPES.ACTION, extra);
  }

  async sendInputAction (action, params = []) {
    let extra = { action, params };
    await this.sendCommand(COMMAND_TYPES.ACTION, extra);
    return true
  }

  async shutdown () {
    if (this.socketClient) {
      this.socketClient.end();
      this.socketClient.destroy();
      this.socketClient = null;
    }
  }

  async init () {
    log.debug('bootstrap init');
  }

  set ignoreUnexpectedShutdown (ignore) {
    log.debug(`${ignore ? 'Ignoring' : 'Watching for'} bootstrap disconnect`);
    this._ignoreUnexpectedShutdown = ignore;
  }

  get ignoreUnexpectedShutdown () {
    return this._ignoreUnexpectedShutdown;
  }
}

export { SocketBootstrap, COMMAND_TYPES };
export default SocketBootstrap;
