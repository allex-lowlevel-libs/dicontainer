function createlib (Map, DeferMap, ListenableMap, q, qext, containerDestroyAll) {
  'use strict';

  function DIContainer () {
    this._instanceMap = new ListenableMap();
    this._deferMap = new DeferMap ();
    this._listeners_map = new Map();
  }

  DIContainer.prototype.destroy = function () {
    containerDestroyAll(this._listeners_map);
    this._listeners_map.destroy();
    this._listeners_map = null;
    this._instanceMap.destroy();
    this._instanceMap = null;
    this._deferMap.destroy();
    this._deferMap = null;
  };

  DIContainer.prototype.destroyDestroyables = function () {
    containerDestroyAll(this._instanceMap);
  };

  DIContainer.prototype.empty = function () {
    return this._instanceMap.count < 1;
  };

  DIContainer.prototype._dowait = function (modulename) {
    var instance = this._instanceMap.get(modulename);
    if (instance) return q.resolve(instance);
    return this._deferMap.promise(modulename);
  };

  DIContainer.prototype.listenFor = function (name, cb, onlywhennotnull, singleshot) {
    return this._instanceMap.listenFor(name, cb, onlywhennotnull, singleshot);
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

  DIContainer.prototype.waitForMulti = function (names, cb) {
    return this._instanceMap.waitForMulti(names, cb);
  };

  DIContainer.prototype.register = function (modulename, instance) {
    this._instanceMap.add(modulename, instance); //let add throw an error for duplicates ...
    this._deferMap.resolve(modulename, instance);
  };

  DIContainer.prototype.registerDestroyable = function (modulename, instance, destroyedlistener) {
    if (!instance.destroyed) {
      if (destroyedlistener) {
        destroyedlistener(instance);
      }
      return;
    }
    var mylistener = this.unregisterDestroyable.bind(this, modulename);
    this._listeners_map.add(modulename, instance.destroyed.attach (
      destroyedlistener ? [mylistener, destroyedlistener] : mylistener
    ));
    this.register(modulename, instance);
  };

  DIContainer.prototype.registerComplexDestroyable = function (modulename, instance, abouttodielistener, destroyedlistener) {
    if (!instance.aboutToDie) {
      abouttodielistener(instance);
      return;
    }
    var mylistener = this.unregisterDestroyable.bind(this, modulename);
    this._listeners_map.add(modulename, instance.aboutToDie.attach (
      abouttodielistener ? [mylistener, abouttodielistener] : mylistener
    ));
    if (destroyedlistener) {
      if (!instance.destroyed) {
        destroyedlistener(instance);
        return;
      }
      instance.destroyed.attach(destroyedlistener);
    }
    this.register(modulename, instance);
  };

  DIContainer.prototype.unregister = function (modulename) {
    ///that's all, folks 
    return this._instanceMap.remove(modulename);
  };

  DIContainer.prototype.unregisterDestroyable = function (modulename) {
    var l = this._listeners_map.remove(modulename);
    if (l) {
      l.destroy();
      l = null;
    }
    this.unregister(modulename);
    modulename = null;
  };

  DIContainer.prototype.fail = function (modulename, reason) {
    this._deferMap.reject(modulename, reason);
  };

  DIContainer.prototype.get = function (modulename) {
    return this._instanceMap.get(modulename);
  };

  DIContainer.prototype.busy = function (modulename) {
    return !!this._instanceMap.get(modulename) || this._deferMap.exists(modulename);
  };

  DIContainer.prototype.traverse = function (cb) {
    return this._instanceMap.traverse(cb);
  };

  return DIContainer;
}
module.exports = createlib;
