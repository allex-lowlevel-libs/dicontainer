var DIContainer = require('./load.js'),
  expect = require('chai').expect,
  cnt = 0;

  function inc () {
    cnt++
  }

  function checker (num, done) {
    expect(cnt).to.be.equal(num);
  }

describe ('Test', function () {
  var dic;
  it ('Instantiation test', function () {
    dic = new DIContainer();
  });

  it ('Attaching waiters', function () {
    dic.waitFor('bla').then(inc);
    dic.waitFor('bla').then(inc);
    dic.waitFor('bla').then(inc);
    var ret = dic.waitFor('bla').then(checker.bind(null, 3));
    dic.register('bla', 2);
    return ret;
  });

  it ('Reset', function () {
    expect (dic.get('bla')).to.be.defined;
    dic.unregister('bla');
    expect (dic.get('bla')).not.to.be.defined;
  });

  it ('Wait for multiple', function (done) {
    cnt = 0;

    var expecting = ['bla', 'truc', 'malo', 'posle'];

    function resolved() {
      expecting.forEach (function (item, index) {
        expect(dic.get(item)).to.be.equal(index+1);
      });
      done();
    }

    dic.waitForMultiple(expecting).done(resolved);
    dic.register('bla', 1);
    dic.register('truc', 2);
    dic.register('malo', 3);
    dic.register('posle', 4);
  });

  it ('Wait for timeout');
  it ('Wait for multiple timeout');


  it ('Destroying test', function () {
    dic.destroy();
  });
});
