var  inherit = require('allex_inheritlowlevellib'),
  dlinkedlistbase = require('allex_doublelinkedlistbaselowlevellib'),
  checkftions = require('allex_checkslowlevellib'),
  cleanftions = require('allex_destructionlowlevellib'),
  functionmanip = require('allex_functionmanipulationlowlevellib')(inherit.inherit),
  eventemitter = require('allex_eventemitterlowlevellib')(dlinkedlistbase, inherit.inherit, checkftions.isFunction),
  fifo = require('allex_fifolowlevellib')(dlinkedlistbase, inherit.inherit),
  avltreelib = require('allex_avltreelowlevellib')(dlinkedlistbase, inherit.inherit),
  timeout = require('allex_timeoutlowlevellib')(checkftions.isFunction, fifo)
  map = require('allex_maplowlevellib')(avltreelib, inherit.inherit),
  q = require('allex_qlowlevellib')(timeout.runNext, checkftions.isArray, checkftions.isFunction, inherit.inherit, functionmanip.dummyFunc, eventemitter),
  qext = require('allex_qextlowlevellib')(q, inherit.inherit, timeout.runNext, fifo, map, cleanftions.containerDestroyAll),
  DeferMap = require('allex_defermaplowlevellib')(map, q);


module.exports = require('../index.js')(map, q, qext, DeferMap, cleanftions.containerDestroyAll);
