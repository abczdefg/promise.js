'use strict'
const PENDING = Symbol('pending');
const FULFILLED = Symbol('fulfilled');
const REJECTED = Symbol('rejected');
const nextTick = (fn => {
  if(process.nextTick) {
    return process.nextTick;
  } else if(setImmediate) {
    return setImmediate;
  }
  return setTimeout(fn, 0);
})();
class Promise {
  constructor(exec) {
    this.status = PENDING;
    this.value = undefined;
    this.reason = undefined;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];
    let resolve = (value) => {
      nextTick(() => {
        // 2.2.2.2
        if(this.status !== PENDING) return; // 2.1.2.1
        // 2.1.1
        this.status = FULFILLED; // 2.2.2.3
        this.value = value;
        this.onFulfilledCallbacks.forEach(f => f(this.value)); // 2.2.6
      });
    };
    let reject = (reason) => {
      nextTick(() => {
        // 2.2.3.2
        if(this.status !== PENDING) return; // 2.1.2.2
        // 2.1.1
        this.status = REJECTED; // 2.2.3.3
        this.reason = reason;
        this.onRejectedCallbacks.forEach(f => f(this.reason)); // 2.2.6
      });
    };
    try {
      exec(resolve, reject);
    } catch(e) {
      reject(e);
    }
  }
  then(
    onFulfilled,
    onRejected
  ) {
    typeof onFulfilled !== 'function' && (onFulfilled = v => v); // 2.2.1.1, 2.2.7.3
    typeof onRejected !== 'function' && (onRejected = e => { throw e }); // 2.2.1.2, 2.2.7.4
    // The Promise Resolution Procedure [[Resolve]](promise, x)
    // It must call by previous promise which should be equal to `this`
    const _resolve = (promise, x, resolve, reject) => {
      if(promise === x) {
        // 2.3.1
        return reject(new TypeError());
      }

      // 2.3.2 If x is a promise, adopt its state
      // 2.3.2 is actually redundant with 2.3.3 (from issue)
      // if(x instanceof Promise) {
      //   if(x.status == PENDING) {
      //     x.then(
      //       y => resolvePromise(promise, y, resolve, reject),
      //       reject
      //     )
      //   } else {
      //     x.then(resolve, reject);
      //   }
      // }

      if(typeof x === 'function' || (x !== null && typeof x === 'object')) {
        // 2.3.3 if x is an object or function
        let isCalled = false, then;
        try {
          then = x.then; // 2.3.3.1
          if(typeof then === 'function') {
            then.call(
              x,
              y => {
                if(isCalled) return;
                isCalled = true;
                // 2.3.3.3.1
                _resolve.call(x, promise, y, resolve, reject);
              },
              r => {
                if(isCalled) return;
                isCalled = true;
                // 2.3.3.3.2
                reject(r);
              }
            );
          } else {
            // 2.3.3.4
            resolve(x);
          }
        } catch(e) {
          if(isCalled) return;
          isCalled = true;
          // 2.3.3.2
          reject(e);
        }
      } else {
        // 2.3.4 If x is not an object or function, fulfill promise with x.
        resolve(x);
      }
    };
    // 2.2.7 then must return a promise
    let thenPromise;
    return thenPromise = new Promise((resolve, reject) => {
      if(this.status === PENDING) {
        // 2.2.2.2
        this.onFulfilledCallbacks.push(value => {
          // 2.2.6.1
          try {
            let x = onFulfilled(value);
            _resolve.call(this, thenPromise, x, resolve, reject)
          } catch(e) {
            reject(e);
          }
        });
        // 2.2.3.2
        this.onRejectedCallbacks.push(reason => {
          // 2.2.6.2
          try {
            let x = onRejected(reason);
            _resolve.call(this, thenPromise, x, resolve, reject)
          } catch(e) {
            reject(e);
          }
        });
      }
      if(this.status === FULFILLED) {
        nextTick(() => { // 2.2.4
          try {
            let x = onFulfilled(this.value); // 2.2.2.1, 2.2.5
            _resolve.call(this, thenPromise, x, resolve, reject)
          } catch(e) {
            reject(e);
          }
        });
      }
      if(this.status === REJECTED) {
        nextTick(() => { // 2.2.4
          try {
            let x = onRejected(this.reason); // 2.2.3.1, 2.2.5
            _resolve.call(this, thenPromise, x, resolve, reject)
          } catch(e) {
            reject(e);
          }
        });
      }
    });
  }
}

module.exports = Promise;

