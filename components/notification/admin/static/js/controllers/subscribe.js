/* global angular, alert */
/**
 * Created by lomaka on 27.03.17.
 */
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
        Authorization: 'Basic kyiv-notify:858E1F21C7542634940243BB35F1C02E1C6AA21310C3C330B7326772A2A35D74ADBBDDC1247F4027E035B490C3051F0C5D9FBF80C65C0FD6F20EF8E0303B8A7B'
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
        Authorization: 'Basic kyiv-notify:858E1F21C7542634940243BB35F1C02E1C6AA21310C3C330B7326772A2A35D74ADBBDDC1247F4027E035B490C3051F0C5D9FBF80C65C0FD6F20EF8E0303B8A7B'
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
