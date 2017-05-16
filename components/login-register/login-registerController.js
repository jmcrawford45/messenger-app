'use strict';

messengerApp.controller('LoginRegisterController', ['$scope', '$rootScope', '$resource', '$location',
    function ($scope, $rootScope, $resource, $location) {
        $scope.main.title = 'Users';
        $scope.main.context = 'Viewing login screen';
        $scope.main.userList = [];
        $scope.registerView = false;
        $scope.errorMsg = undefined;

        $scope.formReset = function() {
            delete $scope.main.password;
            delete $scope.main.first_name;
            delete $scope.main.last_name;
            delete $scope.main.login_name;
            delete $scope.main.passwordConfirm;
        };

    	$scope.login = function() {
            $scope.errorMsg = undefined;
    		var response = $resource('/admin/login').save({login_name: $scope.main.login_name, password: $scope.main.password}, function(){
    		    $rootScope.loggedIn = true;
                $scope.formReset();
                $scope.main.loggedInUser = response;
                $rootScope.$broadcast('listLogin');
                $location.path('/users');
    		}, function(err){
                $scope.errorMsg = err.data;
                $scope.formReset();
            });
    	};

        $scope.register = function() {
            $scope.errorMsg = undefined;
            $scope.registerSuccess = undefined;
            if($scope.main.password !== $scope.main.passwordConfirm){
                $scope.errorMsg = 'Supplied passwords do not match.';
                return;
            }
            var newUser = {
                    first_name: $scope.main.first_name,
                    last_name: $scope.main.last_name,
                    login_name: $scope.main.login_name, 
                    password: $scope.main.password,
                };
            var response = $resource('/user').save(newUser, function(){
                $scope.formReset();
                $scope.registerSuccess = 'User successfully registered.';
            }, function(err){
                $scope.errorMsg = err.data;
            });
        };

        $scope.viewSwap = function(){
            $scope.registerView = !$scope.registerView;
            $scope.errorMsg = undefined;
            $scope.registerSuccess = undefined;
            if($scope.registerView){
                $scope.main.context = 'Viewing registration screen';
            } else {
                $scope.main.context = 'Viewing login screen';
            }
        };
    }]);

