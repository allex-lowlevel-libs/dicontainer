function createlib (Map, DeferMap, ListenableMap, q, qext, containerDestroyAll) {
  'use strict';

  function DIContainer () {
    this._instanceMap = new ListenableMap();
    this._deferMap = new DeferMap ();
    this._listeners_map = new Map();
    this._creationQ = new qext.JobCollection();
  }

  DIContainer.prototype.destroy = function () {
    if (this._creationQ) {
      this._creationQ.destroy();
    }
    this._creationQ = null;
    if (this._listeners_map) {
      containerDestroyAll(this._listeners_map);
      this._listeners_map.destroy();
    }
    this._listeners_map = null;
    if (this._instanceMap) {
      this._instanceMap.destroy();
    }
    this._instanceMap = null;
    if (this._deferMap) {
      this._deferMap.destroy();
    }
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

  DIContainer.prototype.queueCreation = function (modulename, creationfunc) {
    var ret, check;
    check = this._instanceMap.get(modulename);
    if (typeof(check) == 'undefined') {
      ret = this.waitFor(modulename);
      this._creationQ.run('.', new CreationJob(this, modulename, creationfunc));
    }
    return ret || this.waitFor(modulename);
  };

  DIContainer.prototype.traverse = function (cb) {
    return this._instanceMap.traverse(cb);
  };


  // CreationJob
  function CreationJob (dicont, depname, creationfunc) {
    qext.JobOnDestroyableBase.call(this, dicont, creationfunc);
    this.dicont = dicont;
    this.depname = depname;
    this.creationfunc = creationfunc;
  }
  CreationJob.prototype = Object.create(qext.JobOnDestroyableBase.prototype,{constructor:{
    value: CreationJob,
    enumerable: false,
    configurable: false,
    writable: false
  }});
  CreationJob.prototype.destroy = function () {
    this.creationfunc = null;
    this.depname = null;
    this.dicont = null;
    qext.JobOnDestroyableBase.prototype.destroy.call(this);
  };
  CreationJob.prototype._destroyableOk = function () {
    if (!this.destroyable) {
      throw new Error('No DIContainer');
    }
    if (!this.destroyable._instanceMap) {
      throw new Error('DIContainer destroyed');
    }
    return true;
  };
  CreationJob.prototype.go = function () {
    var ok, check, ret;
    ok = this.okToGo();
    if (!ok.ok) {
      return ok.val;
    }
    if (!this.dicont) {
      this.reject(new Error('DIContainer is gone'));
      return ok.val;
    }
    if (!(this.creationfunc && typeof(this.creationfunc)=='function')) {
      this.reject(new Error('No creation function'));
      return ok.val;
    }
    check = this.dicont.get(this.depname);
    if (typeof(check) !== 'undefined') {
      this.resolve(check);
      return ok.val;
    }
    try {
      check = this.creationfunc();
    } catch (e) {
      this.reject(e);
      return ok.val;
    }

    if (!q.isThenable(check)) {
      this.onCreationSuccess(check);
      return ok.val;
    }
    check.then(
      this.onCreationSuccess.bind(this),
      this.onCreationSuccess.bind(this, null)
    );
    return ok.val;
  };
  CreationJob.prototype.onCreationSuccess = function (instance, creationerror) {
    if (creationerror) {
      console.error('Creation Error', creationerror);
      this.reject(creationerror);
      return;
    }
    if (instance && instance.destroyed && instance.destroyed.attach) {
      this.dicont.registerDestroyable(this.depname, instance);
    } else {
      this.dicont.register(this.depname, instance);
    }
    this.resolve(true);
  };

  
  // CreationJob end

  return DIContainer;
}
module.exports = createlib;
