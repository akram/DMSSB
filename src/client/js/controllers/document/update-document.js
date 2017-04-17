function UpdateDocumentController($rootScope, $scope, $http, $stateParams, Upload, ObjectDiff, commonFactory) {

  initializeController();

  function updateDocumentHistory() {
    var diff = ObjectDiff.diffOwnProperties($scope.originalDocument, $scope.selectedDocument);
    //something has changed in the document
    if (diff.changed !== 'equal') {
      $scope.documentHistory.docId = $scope.selectedDocument._id;
      for (let [key, value] of Object.entries(diff.value)) {
        if (value.added) {
          $scope.documentHistory.history.push({
            user: $rootScope.client.username,
            field: key,
            added: value.added,
            removed: value.removed,
            created: new Date()
          });
        }
      }

      let filesResult = $scope.selectedDocument.files.length - $scope.originalDocument.files.length;

      if (filesResult !== 0) {
        $scope.documentHistory.history.push({
          user: $rootScope.client.username,
          field: 'files',
          list: true,
          value: filesResult,
          created: new Date()
        });
      }

      if ($scope.selectedDocument.type.type !== $scope.originalDocument.type.type) {
        $scope.documentHistory.history.push({
          user: $rootScope.client.username,
          field: 'type',
          added: $scope.selectedDocument.type.type,
          removed: $scope.originalDocument.type.type,
          created: new Date()
        });
      }

      let url = `/api/documents-history/${(!$scope.documentHistory.new) ? $scope.documentHistory.docId : ''}`;
      let method = $scope.documentHistory.new ? 'POST' : 'PUT';

      $http({
          method: method,
          url: url,
          data: $scope.documentHistory
        }).then(function(response) {
          $scope.documentHistory = response.data;
          $scope.originalDocument = angular.copy($scope.selectedDocument);
        })
        .catch(function(error) {
          console.log(error);
          commonFactory.toastMessage('Woops! Algo paso!', 'danger');
        });
    }
  }

  $scope.saveDocument = function() {
    //updates document history
    updateDocumentHistory();
    //updates document

    //sends email

    //   if ($scope.files && $scope.files.length) {


    //     delete $scope.selectedDocument.type["$$hashKey"];

    //     Upload.upload({
    //       url: `/api/documents/${$scope.selectedDocument.name}`,
    //       data: {
    //         files: $scope.files,
    //         document: $scope.selectedDocument
    //       }
    //     }).then(function(response) {
    //       console.log(response);
    //     }, function(response) {
    //       if (response.status > 0) {
    //         $scope.errorMsg = response.status + ': ' + response.data;
    //       }
    //     }, function(evt) {
    //       $scope.progress =
    //         Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
    //     });
    //   }
  };

  $scope.download = function(fileName, filePath) {
    $http.get(`/api/documents/downloads/${encodeURIComponent(filePath)}`, {
        responseType: "arraybuffer"
      })
      .then(function(response) {
        var blob = new Blob([response.data], {
          type: 'application/octet-stream'
        });

        var objectUrl = URL.createObjectURL(blob);
        var anchor = document.createElement("a");
        anchor.download = fileName;
        anchor.href = objectUrl;
        anchor.click();
        anchor.remove();
      })
      .catch(function(error) {
        console.log(error);
      });
  }

  $scope.retrieveImplications = function() {
    if ($scope.systems) {
      let filteredImplications = $scope.systems.filter(e => e.system === $scope.selectedDocument.system);

      return (filteredImplications.length > 0) ? filteredImplications[0].implications : [];
    }

    return null;
  }

  function initializeController() {
    $(".datepicker input").datepicker({});
    $scope.selectedDocument = {
      status: "Nuevo"
    };
    $scope.priorities = ["Alta", "Normal", "Bajo"];
    retrieveDocument();
    retrieveDocumentHistory();
    retrieveBusiness();
    retrieveClients();
    retrieveDepartments();
    retrieveDocTypes();
    retrieveSystems();
  }

  function retrieveDocument() {
    $http.get(`/api/documents/${$stateParams.id}`)
      .then(function(response) {
        $scope.selectedDocument = response.data;
        $scope.selectedDocument.requestedDate = commonFactory.formatDate(new Date($scope.selectedDocument.requestedDate));
        $scope.selectedDocument.requiredDate = commonFactory.formatDate(new Date($scope.selectedDocument.requiredDate));
        $scope.selectedDocument.expiredDate = commonFactory.formatDate(new Date($scope.selectedDocument.expiredDate));

        $scope.originalDocument = angular.copy($scope.selectedDocument);
      })
      .catch(function(error) {
        console.log(error);
      });
  }

  function retrieveBusiness() {
    $http.get('/api/business/')
      .then(function(response) {
        $scope.business = response.data;
      })
      .catch(function(error) {
        console.log(error);
      });
  }

  function retrieveDocumentHistory() {
    $http.get(`/api/documents-history/${$stateParams.id}`)
      .then(function(response) {
        $scope.documentHistory = response.data;
        if (!$scope.documentHistory) {
          $scope.documentHistory = {
            new: true,
            history: []
          };
        }
      })
      .catch(function(error) {
        console.log(error);
      });
  }

  function retrieveClients() {
    $http.get('/api/clients/')
      .then(function(response) {
        $scope.clients = response.data;
      })
      .catch(function(error) {
        console.log(error);
      });
  }

  function retrieveDepartments() {
    $http.get('/api/departments/')
      .then(function(response) {
        $scope.departments = response.data;
      })
      .catch(function(error) {
        console.log(error);
      });
  }

  function retrieveDocTypes() {
    $http.get('/api/document-types/')
      .then(function(response) {
        $scope.docTypes = response.data;
      })
      .catch(function(error) {
        console.log(error);
      });
  }

  function retrieveSystems() {
    $http.get('/api/systems/')
      .then(function(response) {
        $scope.systems = response.data;
      })
      .catch(function(error) {
        console.log(error);
      });
  }
}

UpdateDocumentController.$inject = ['$rootScope', '$scope', '$http', '$stateParams', 'Upload', 'ObjectDiff', 'commonFactory'];
angular.module('app', ['ngFileUpload', 'ds.objectDiff']).controller('updateDocumentController', UpdateDocumentController);