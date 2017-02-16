function MainController($rootScope, $scope, $http, commonFactory) {

  initializeController();

  $scope.deleteSurvey = function(id) {
    $http.delete("/api/surveys/" + id)
      .then(
        function(response) {
          // success callback
          commonFactory.activateAlert('Encuesta fue borrada exitosamente!', 'info');
          retrieveSurveys();
        },
        function(response) {
          // failure callback
          commonFactory.activateAlert('Woops! Algo paso!', 'danger');
        }
      );

  }

  function initializeController() {
    retrieveSurveys();
  }

  function retrieveSurveys() {
    let url = '/api/surveys/';

    if ($rootScope.client.role.level === 2) {
      url = `/api/surveys/department/${$rootScope.client.department}`;
    }

    $http.get(url)
      .then(
        function(response) {
          $scope.surveys = response.data;
        },
        function(response) {
          console.log(response);
        }
      );
  }
}

MainController.$inject = ['$rootScope', '$scope', '$http', 'commonFactory'];
angular.module('app').controller('mainController', MainController);
