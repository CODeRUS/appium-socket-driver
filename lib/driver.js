import {BaseDriver, errors} from 'appium/driver';
import Bootstrap from './socket-bootstrap.js';
import log from './logger';

class SocketDriver extends BaseDriver {
  constructor(
    opts = ({}),
    shouldValidateCaps = false
  ) {
    super(opts, shouldValidateCaps);
	
	this.locatorStrategies = [];
  }

  async createSession(w3cCapabilities1, w3cCapabilities2, w3cCapabilities3, driverData = []) {
    let [sessionId, caps] = /** @type {[string, FakeDriverCaps]} */ (
      await super.createSession(w3cCapabilities1, w3cCapabilities2, w3cCapabilities3, driverData)
    );
	await this.startBootstrap();
    return [sessionId, caps];
  }
  
  async deleteSession() {
	await this.bootstrap.shutDown();
    await super.deleteSession();
  }

  async executeCommand(cmd, ...args) {
    if (!Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), cmd)) {
      SocketDriver.prototype[cmd] = async function() {
        return await this.bootstrap.sendAction(cmd, Array.from(arguments).slice(0, -1));
      };
    }
    return await super.executeCommand(cmd, ...args);
  }

  async startBootstrap() {
    this.bootstrap = new Bootstrap(this.opts);
    await this.bootstrap.start();
  }
}

export { SocketDriver };
export default SocketDriver;
