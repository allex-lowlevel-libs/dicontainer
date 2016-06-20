function createlib (SimpleDestroyable, Map, q, qext) {
  'use strict';

  function DIContainer () {
    this._instanceMap = new Map();
    this._deferMap = new Map ();
    this._listeners_map = new Map();
  }

  lib.inherit (DIContainer, SimpleDestroyable);
  DIContainer.prototype.__cleanUp = function () {
    //TODO
  };

  DIContainer.prototype._dowait = function (modulename) {
    var instance = this._instanceMap.get(modulename);
    if (instance) return q.resolve(instance);

    var d = this._deferMap.get(modulename);
    if (!d) {
      d = q.defer();
      this._deferMap.add(modulename);
    }

    return d.promise;
  };

  DIContainer.prototype.waitFor = function (modulename, timeout) {
    var p = this._dowait(modulename);
    return timeout ? qext.waitForPromise(p, timeout) : p;
  };

  DIContainer.prototype._doWaitForMultiple = function (modulename_arr) {
    var d = q.defer();
    q.spread (modulename_arr.map (this._dowait.bind(this)), d.resolve.bind(d), d.reject.bind(d), d.notify.bind(d));
    return d.promise;
  };

  DIContainer.prototype.waitForMultiple = function (modulename_arr, timeout) {
    var p = this._doWaitForMultiple(modulename_arr);
    return timeout ? qext.waitForPromise(p, timeout) : p;
  };

  DIContainer.prototype.register = function (modulename, instance) {
    this._instanceMap.add(modulename, instance); //let add throw an error for duplicates ...
    var defer = this._deferMap.get(modulename);
    if (!defer) return; //nothing more to be done ...
    this._deferMap.remove(modulename);
    defer.resolve(instance);
  };

  DIContainer.prototype.registerDestroyable = function (modulename, instance) {
    var l = instance.destroyed.attach (this.unregister.bind(this, modulename);
    try {
      this.register(modulename, instance);
    }catch(e) {
      //if register throws an error destroy a listener and rethrow an error ...
      l.destroy();
      l = null;
      throw (e);
      return;
    }
    this._listeners_map.add(modulename, l);
  };

  DIContainer.prototype.unregister = function (modulename) {
    ///that's all, folks 
    this._instanceMap.remove(modulename);
  };

  DIContainer.prototype.fail = function (modulename, reason) {
    var d = this._deferMap.get(modulename);
    if (!d) return;
    d.reject (reason);
  };

  return DIContainer;
}
module.exports = createlib;
