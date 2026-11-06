/* global angular, window */
angular.module('admin',[]).config(function ($sceDelegateProvider) {

  $sceDelegateProvider.resourceUrlWhitelist(['**']);
}).run(function ($rootScope,$http) {
  $rootScope.activePath = window.location.pathname;
  $rootScope.loading = false;
  $rootScope.logout = function () {
    $http.get('/admin/logout').then(function (_resp) {
      window.location.reload();
    });
  };

  $http.get('/admin/api/queue/count').then(function (resp) {
    $rootScope.queueCounter = resp.data.smsQueueCount;
  });
});
