/* global describe, beforeEach, after */
function importTest(name, path) {
  describe(name, function () {
    require(path);
  });
}

describe('app', function () {
  beforeEach(function () {});
  describe('controllers', function () {
    importTest('lists', './controllers/lists');
  });
  after(function () {});
});
