'use strict';


var Service, Characteristic;

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory('homebridge-433garage', 'homebridge-433garage', homebridge-433garageAccessory);
};

class homebridge-433garageAccessory {
  constructor (log, config) {

    //get config values
    this.command = config ['command'];
    this.name = config['name'];
    this.simulateTimeOpening = config['simulateTimeOpening'] || 15;
    this.simulateTimeOpen = config['simulateTimeOpen'] || 30;
    this.simulateTimeClosing = config['simulateTimeClosing'] || 15;

    //initial setup
    this.log = log;
    this.lastOpened = new Date();
    this.service = new Service.GarageDoorOpener(this.name, this.name);
    this.setupGarageDoorOpenerService(this.service);

    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, 'RT')
      .setCharacteristic(Characteristic.Model, 'A Remote Control')
      .setCharacteristic(Characteristic.SerialNumber, '0711');
  }

  getServices () {
    return [this.informationService, this.service];
  }

  setupGarageDoorOpenerService (service) {

    this.service.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
    this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);

    service.getCharacteristic(Characteristic.TargetDoorState)
      .on('get', (callback) => {
        var targetDoorState = service.getCharacteristic(Characteristic.TargetDoorState).value;
        if (targetDoorState === Characteristic.TargetDoorState.OPEN && ((new Date() - this.lastOpened) >= (this.closeAfter * 1000))) {
          this.log('Setting TargetDoorState -> CLOSED');
          callback(null, Characteristic.TargetDoorState.CLOSED);
        } else {
          callback(null, targetDoorState);
        }
      })
      .on('set', (value, callback) => {
        if (value === Characteristic.TargetDoorState.OPEN) {
          this.lastOpened = new Date();
          switch (service.getCharacteristic(Characteristic.CurrentDoorState).value) {
            case Characteristic.CurrentDoorState.CLOSED:
            case Characteristic.CurrentDoorState.CLOSING:
            case Characteristic.CurrentDoorState.OPEN:
              this.openGarageDoor(callback);
              break;
            default:
              callback();
          }
        } else {
          callback();
        }
      });
  }

  openGarageDoor (callback) {
    this.simulateDoorOpening();
    var exec = require('child_process').exec;
    var cmd = this.command;
    exec(cmd, function(error, stdout, stderr) {
      this.log(stdout);
    }.bind(this));
  }


  simulateGarageDoorOpening () {
    this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPENING);
    setTimeout(() => {
      this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN);
      setTimeout(() => {
        this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSING);
        this.service.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
        setTimeout(() => {
          this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
        }, this.simulateTimeClosing * 1000);
      }, this.simulateTimeOpen * 1000);
    }, this.simulateTimeOpening * 1000);
  }
}
