/* global angular, alert, window */
/**
 * Created by lomaka on 27.03.17.
 */

const basicAuthToken = process.env.BASIC_AUTH || 'test:test';

angular.module('admin').controller('list', function ($scope, $http,$rootScope) {

  $scope.data = {eventSelected: undefined};

  $scope.short_text = '';
  $scope.short_text_translit = '';
  $scope.short_text_old = '';
  $scope.testMessage = {
    code:'050',
    number:''
  };

  $scope.useTranslit = false;
  $scope.$watch('useTranslit', function (pre, _next) {
    if (pre) {
      $scope.short_text_length = 72;
      if ($scope.short_text.length > 72) {
        $scope.short_text_old = $scope.short_text;
        $scope.short_text = $scope.short_text.substr(0, 72);
      }
    } else {
      $scope.short_text_length = 160;
      if ($scope.short_text_old.trim().length > 0)$scope.short_text = $scope.short_text_old;
    }
  });

  $http({
    method: 'GET',
    url: '/eventsAndTransports'
  }).then(function (response) {
    $scope.events = response.data.filter(function (value) {
      return value.settings.find(function (val) {
        return val.communication.name == 'sms';
      });
    }).map(function (val) {
      return {id: val.event_id, name: val.name};
    });
  });

  $http({
    method: 'GET',
    url: '/message'
  }).then(function (response) {
    $scope.messages = response.data;
  });


  $scope.sendTest = function () {
    if($scope.testMessage.number.trim().length == 0)return alert('Номер телефону для тестового повідомлення пустий');
    if($scope.short_text_translit.trim().length > 160)return alert('Довжина транслитерованого тексту більше ніж 160 символів');
    if(/^\d{7}/.test($scope.testMessage.number)==false || (/^\d{7}/.test($scope.testMessage.number)==false && $scope.testMessage.number.length>7))return alert('Номер телефону для тестового не вірний');

    $rootScope.loading = true;
    $http({
      method: 'POST',
      url: '/message/phonesList',
      headers: {
        Authorization: `Basic ${basicAuthToken}`
      },
      data: {
        list_phone: ['+38'+$scope.testMessage.code+$scope.testMessage.number],
        short_message: $scope.useTranslit?$scope.short_text:'',
        short_message_translit: $scope.short_text_translit
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

  $scope.sendForm = function () {
    if($scope.short_text_translit.trim().length > 160)return alert('Довжина транслитерованого тексту більше ніж 160 символів');
    $rootScope.loading = true;
    $http({
      method: 'POST',
      url: '/message/eventId',
      headers: {
        Authorization: `Basic ${basicAuthToken}`
      },
      data: {
        event_id: $scope.data.eventSelected,
        short_message: $scope.short_text,
        short_message_translit: $scope.short_text_translit
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

}).directive('translit',function () {
  return {
    require: 'ngModel',
    link: function (scope, element, attr, ngModelCtrl) {
      function fromUser(text) {
        if (text) {
          let transformedInputLength = window.translit(text),
            transformedInput = text;
          if (transformedInputLength.length > 160) {
            element.parent().addClass('has-error');
          }else{
            element.parent().removeClass('has-error');
          }

          scope[attr.ngTranslitTarget] = transformedInputLength;
          return transformedInput;
        }
        scope[attr.ngTranslitTarget] = '';
        return '';
      }

      ngModelCtrl.$parsers.push(fromUser);
    }
  };
});
