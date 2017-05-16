'use strict';

var messengerApp = angular.module('messengerApp', ['ngRoute', 'ngMaterial', 'ngResource']);

messengerApp.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider.
            when('/users', {
                templateUrl: 'components/user-list/user-listTemplate.html',
                controller: 'UserListController'
            }).
            when('/users/:userId', {
                templateUrl: 'components/conversation/conversationTemplate.html',
                controller: 'ConversationController'
            }).
            when('/admin/login', {
                templateUrl: 'components/login-register/login-registerTemplate.html',
                controller: 'LoginRegisterController'
            }).
            otherwise({
                redirectTo: '/admin/login'
            });
    }]);

messengerApp.controller('MainController', ['$scope', '$resource', '$location', '$rootScope', '$http',
    function ($scope, $resource, $location, $rootScope, $http) {
        $scope.main = {};
        $scope.main.title = 'Users';
        $rootScope.loggedIn = false;

        /*
         * timeStr - Converts the model timestamp to a more readable view
         *   timestamp - string - String encoding (e.g. "2009-07-10 16:02:49") of the timestamp.
         * Returns a string encoding of the form "July 10, 2009 at 4:02PM"
         */
        $scope.main.timeStr = function(timestamp) {
          var date = new Date(timestamp);
          var months = ['January', 'February', 'March', 'April',
            'May','June','July','August','September','October',
            'November','December'];
          var result = '';
          result += months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
          var hour = date.getHours() % 12;
          var minutes = (date.getMinutes() < 10) ? '0' + date.getMinutes() : date.getMinutes();
          if(hour === 0) {hour = 12;}
          var amPm = (date.getHours() >= 12) ? 'PM' : 'AM';
          result += ' at ' + hour + ':' + minutes + amPm;
          return result;
        };

        $rootScope.$on( "$routeChangeStart", function(event, next, current) {
          if ($rootScope.loggedIn === false) {
             // no logged user, redirect to /login-register unless already there
            if (next.templateUrl !== "components/login-register/login-registerTemplate.html") {
                $location.path("/login-register");
            }
          }
       }); 

        $scope.logout = function() {
            var response = $resource('/admin/logout').save(function(){
                $rootScope.loggedIn = false;
                $location.path("/admin/login");
            });
        };

        //Fetch the version number for the toolbar
        var Response = $resource('/schema').get(function(){
            $scope.main.version = Response.__v;
        });
    }]);
