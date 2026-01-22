'use strict';

const dgram = require('dgram');
const os = require('os');

let Accessory, Service, Characteristic, UUIDGen;

class LMSPlatform {
  constructor(log, config, api) {
    this.log = log;
    this.config = config || {};
    this.api = api;

    this.name = this.config.name || 'Lyrion Music Server';
    this.autoDiscover = this.config.autoDiscover !== false; // default true
    this.lmsHost = this.config.lmsHost || null;
    this.lmsPort = this.config.lmsPort || 9000;
    this.debug = this.config.debug || false;

    this.players = [];

    this.log.info('LMSPlatform initialising...');
    this.log.info(`AutoDiscover: ${this.autoDiscover}`);
    if (this.lmsHost) this.log.info(`Configured LMS Host: ${this.lmsHost}:${this.lmsPort}`);

    if (api) {
      this.api.on('didFinishLaunching', () => {
        this.log.info('Homebridge finished launching');

        if (this.autoDiscover) {
          this.discoverLMS();
        } else if (this.lmsHost) {
          this.connectToLMS(this.lmsHost, this.lmsPort);
        } else {
          this.log.error('No LMS host configured and autoDiscover disabled');
        }
      });
    }
  }

  configureAccessory(accessory) {
    // cached accessories restore
    this.log.info(`Restoring cached accessory: ${accessory.displayName}`);
  }

  discoverLMS() {
    this.log.info('Starting LMS auto-discovery...');

    const socket = dgram.createSocket('udp4');
    socket.bind(3483, () => {
      socket.setBroadcast(true);
      const message = Buffer.from('eIPAD\0NAME\0JSON\0VERS\01.0\0');
      socket.send(message, 0, message.length, 3483, '255.255.255.255');
    });

    socket.on('message', (msg, rinfo) => {
      const data = msg.toString();
      if (this.debug) this.log.info(`Discovery response from ${rinfo.address}: ${data}`);

      if (!this.lmsHost) {
        this.lmsHost = rinfo.address;
        this.log.info(`Discovered LMS at ${this.lmsHost}:${this.lmsPort}`);
        this.connectToLMS(this.lmsHost, this.lmsPort);
      }
    });

    setTimeout(() => {
      socket.close();
      if (!this.lmsHost) {
        this.log.error('No LMS servers discovered');
      }
    }, 5000);
  }

  connectToLMS(host, port) {
    this.log.info(`Connecting to LMS at ${host}:${port}`);
    // next stage: JSON-RPC handshake + player enumeration
  }

  discoverDevices() {
    return [];
  }
}

module.exports = (api) => {
  Accessory = api.platformAccessory;
  Service = api.hap.Service;
  Characteristic = api.hap.Characteristic;
  UUIDGen = api.hap.uuid;

  api.registerPlatform(
    'homebridge-mysqueezebox-v2',  // MUST match package.json "name"
    'LMSPlatform',                 // MUST match config.json "platform"
    LMSPlatform
  );
};
