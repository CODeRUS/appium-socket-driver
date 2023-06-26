import log from './logger';
import {server as baseServer, routeConfiguringFunction} from 'appium/driver';
import {SocketDriver} from './driver';

async function startServer(port, hostname) {
  const d = new SocketDriver();
  const server = await baseServer({
    routeConfiguringFunction: routeConfiguringFunction(d),
    port,
    hostname,
  });
  log.info(`SocketDriver server listening on http://${hostname}:${port}`);
  return server;
}

export {startServer};