import '@types/jest';

declare global {
  var describe: typeof import('@jest/globals').describe;
  var it: typeof import('@jest/globals').it;
  var expect: typeof import('@jest/globals').expect;
  var test: typeof import('@jest/globals').test;
  var beforeEach: typeof import('@jest/globals').beforeEach;
  var afterEach: typeof import('@jest/globals').afterEach;
  var beforeAll: typeof import('@jest/globals').beforeAll;
  var afterAll: typeof import('@jest/globals').afterAll;
}

export {};