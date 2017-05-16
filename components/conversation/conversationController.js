'use strict';

messengerApp.controller('ConversationController', ['$scope', '$routeParams', '$resource', '$rootScope',
  function ($scope, $routeParams, $resource, $rootScope) {

    var userId = $routeParams.userId;
    $scope.main.encrypted = true;

    //Fetch model for the user.
    var response = $resource('/user/' + userId).get(function(){
        $scope.main.userView = response;
        console.log(response);
        $scope.main.context = 'Viewing conversation with ' + $scope.main.userView.first_name + ' ' + $scope.main.userView.last_name;
    });


    $scope.updateConversation = function(){
        console.log('update');
        var response = $resource('/conversation/' + userId).query(function(){
            console.log(response);
            response.forEach(function(item) {
                item.date_time = $scope.main.timeStr(item.date_time);
                if (item.sender === $scope.main.userView._id) {
                  item.sender = $scope.main.userView.login_name;
                } else {
                  item.sender = 'You';
                }
            });
            $scope.messages = response;
        });
    };

    $scope.updateConversation();

    $scope.formReset = function() {
        delete $scope.main.msg;
    };

    $scope.$on('newMessage', function(){
        $scope.updateConversation();
    });

    $scope.addMessage = function() {
      $scope.errorMsg = undefined;
        var response = $resource('/message/' + userId).save({msg: $scope.main.msg, encrypted: $scope.main.encrypted}, function(){
            $scope.formReset();
            $rootScope.$broadcast('newMessage');
        }, function(err){
                $scope.errorMsg = err.data;
                $scope.formReset();
        });
    }
  }]);
