/* global angular, alert */
/**
 * Created by lomaka on 27.03.17.
 */

const basicAuthToken = process.env.BASIC_AUTH || 'test:test';

angular.module('admin').controller('unsubscribe', function ($scope, $http,$rootScope) {

  $scope.data = {eventSelected: undefined};

  $scope.unsubscribeObject = {
    code: '093',
    number: ''
  };
  $http({
    method: 'GET',
    url: '/eventsAndTransports'
  }).then(function (response) {
    $scope.events = response.data.filter(function (value) {
      return value.settings.find(function (val) {
        return val.communication.name == 'sms';
      });
    }).map(function (val) {
      let setting = val.settings.find(function (val) {
          return val.communication.name == 'sms';
        }),
        setting_id = setting.id;
      return {
        id: val.event_id,
        name: val.name,
        setting_id: setting_id
      };
    });
  });

  $scope.sendFormUnsubscribe = function () {
    $rootScope.loading = true;

    $http({
      method: 'DELETE',
      url: '/userSubscribes/phone?phone=38' + $scope.unsubscribeObject.code + $scope.unsubscribeObject.number,
      headers: {
        Authorization: `Basic ${basicAuthToken}`
      }
    }).then(function (response) {
      console.log(response);
      $rootScope.loading = false;
      alert('ok');
    }, function (error) {
      console.error(error);
      $rootScope.loading = false;
      alert(error.data.message);
    });
  };

  $scope.sendFormSubscribe = function () {
    $rootScope.loading = true;
    $http({
      method: 'POST',
      url: '/userSubscribes/phone',
      headers: {
        Authorization: `Basic ${basicAuthToken}`
      },
      data: {
        phone: '38' + $scope.unsubscribeObject.code + $scope.unsubscribeObject.number,
        setting_id: $scope.data.eventSelected
      }
    }).then(function (response) {
      console.log(response);
      $rootScope.loading = false;
      alert('ok');
    }, function (error) {
      console.error(error);
      let message;
      if(error.data.message)message = error.data.message;
      if(error.status == 404)message = 'Користувач з таким номером телефону не знайдений';
      $rootScope.loading = false;
      alert(message);
    });
  };

});
