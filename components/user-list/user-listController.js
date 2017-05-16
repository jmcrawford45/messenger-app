'use strict';

messengerApp.controller('UserListController', ['$scope', '$resource',
    function ($scope, $resource) {
        $scope.main.title = 'Users';
        $scope.main.context = 'Viewing list of users';
        $scope.main.userList = [];
        //Fetch the list of users.
        var response = $resource('/user/list').query(function(){
            $scope.main.userList = response;
        });
        $scope.$on('listLogin', function(){
        	var response = $resource('/user/list').query(function(){
        	    $scope.main.userList = response;
        	});
        });

    }]);

