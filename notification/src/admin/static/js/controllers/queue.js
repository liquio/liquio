/* global angular */
/**
 * Created by lomaka on 27.03.17.
 */
angular.module('admin').controller('queue', function ($scope, $http,$rootScope) {
  $scope.queue = [];


  function GetPager(totalItems, currentPage, pageSize) {
    // default to first page
    currentPage = currentPage || 1;

    // default page size is 10
    pageSize = pageSize || 10;

    // calculate total pages
    let totalPages = Math.ceil(totalItems / pageSize);

    let startPage, endPage;
    if (totalPages <= 10) {
      // less than 10 total pages so show all
      startPage = 1;
      endPage = totalPages;
    } else {
      // more than 10 total pages so calculate start and end pages
      if (currentPage <= 6) {
        startPage = 1;
        endPage = 10;
      } else if (currentPage + 4 >= totalPages) {
        startPage = totalPages - 9;
        endPage = totalPages;
      } else {
        startPage = currentPage - 5;
        endPage = currentPage + 4;
      }
    }

    // calculate start and end item indexes
    let startIndex = (currentPage - 1) * pageSize;
    let endIndex = Math.min(startIndex + pageSize - 1, totalItems - 1);

    // create an array of pages to ng-repeat in the pager control
    let pages = Array.apply(null, {length: endPage + 1}).map(Number.call, Number);
    pages.shift();
    return {
      totalItems: totalItems,
      currentPage: currentPage,
      pageSize: pageSize,
      totalPages: totalPages,
      startPage: startPage,
      endPage: endPage,
      startIndex: startIndex,
      endIndex: endIndex,
      pages: pages
    };
  }
  $scope.pager = {};
  $scope.setPage = function (page) {
    if (page < 1 || page > $scope.pager.totalPages) {
      return;
    }

    // get pager object from service
    $scope.pager = GetPager($scope.queue.length, page);
    // get current page of items
    $scope.items = $scope.queue.slice($scope.pager.startIndex, $scope.pager.endIndex + 1);
  };
  $http.get('/admin/api/queue').then(function (resp) {
    $scope.queue = resp.data;
    $scope.setPage(1);
  });

  $scope.clearQueue = function (sms_id) {
    $http.get('/admin/api/queue/clear/'+sms_id).then(function (resp) {
      $scope.queue = resp.data.queue;
      $rootScope.queueCounter = resp.data.smsQueueCount;
      $scope.setPage(1);
    });
  };

  $scope.resendSMS = function (sms_id) {
    $http.get('/admin/api/queue/resend/'+sms_id).then(function (resp) {
      $scope.queue = resp.data.queue;
      $rootScope.queueCounter = resp.data.smsQueueCount;
      $scope.setPage(1);
    });
  };

});
