function SurveyHandlerController($rootScope, $scope, $http, $stateParams, commonFactory) {

  initializeController();

  function initializeController() {
    $scope.activeSurvey = false;
    $scope.completeSurvey = {};
    generateSurvey();
  }

  function retrieveSurveyResponses() {
    $http.get(`/api/surveys/${$stateParams.id}/responses/client/${$rootScope.client._id}`)
      .then(function(response) {
        $scope.completed = (response.data) ? true : false;
      })
      .catch(function(error) {
        console.log(error);
      });
  }

  function sendDataToServer(survey) {
    const data = survey.data;

    const response = {
      job: $rootScope.client.job,
      results: [],
      timestamp: new Date(),
      client: {
        _id: $rootScope.client._id,
        username: $rootScope.client.username
      }
    };

    for (var question of Object.keys(data)) {
      //Gets selected question
      const selectedQuestions = $scope.completeSurvey.questions.filter(e => {
        return e.name === question;
      });

      //if no questions found, break the loop
      if (selectedQuestions.length === 0)
        break;

      //grabs the selected question
      const selectedQuestion = selectedQuestions[0];

      response.surveyId = $scope.completeSurvey._id;
      //builds response Object
      const result = {
        service: selectedQuestion.service,
        question: question,
        formType: selectedQuestion.formType,
        answer: data[question],
        rates: selectedQuestion.rateValues
      };

      //Questions that has a value
      if (selectedQuestion.formType === 'checkbox' || selectedQuestion.formType === 'dropdown' || selectedQuestion.formType === 'radiogroup') {
        const values = selectedQuestion.choicesValue.map(e => {
          return e.value;
        });
        if (data[question] instanceof Array) {
          result.answer = data[question].join();
          const answerValues = [];
          data[question].forEach(e => {
            answerValues.push(values[selectedQuestion.choices.indexOf(e)]);
          });
          result.value = answerValues.join();
        } else {
          result.value = values[selectedQuestion.choices.indexOf(data[question])] + '';
        }
      }

      response.results.push(result);
    }


    $http.post('/api/surveys/responses/', response)
      .then(function(response) {
        console.log(response);
      })
      .catch(function(error) {
        console.log(error);
      });
  }

  function generateSurvey() {
    let url = `/api/surveys/${$stateParams.id}/clients/${$rootScope.client.job}/`;

    if ($rootScope.client.role.level === 1) {
      url = '/api/surveys/' + $stateParams.id;
    }

    $http.get(url)
      .then(function(response) {
        if (response.data) {
          buildSurvey(response.data);
        } else {
          $scope.textNotFound = "no fue encontrada!";
        }
      })
      .catch(function(error) {
        console.log(error);
        $scope.textNotFound = "no fue encontrada!";
      });
  }

  function buildSurvey(survey) {
    $scope.activeSurvey = survey.active;

    // if (survey.uniqueResponses) {
    //   $scope.activeSurvey = !$scope.completed;
    // }

    if (!$scope.activeSurvey) {
      $scope.textNotFound = (!survey.active) ? "no esta activa!" : 'ya esta completada!';
      return;
    }

    //set each form type to type;
    survey.questions = survey.questions.map(question => {
      question.type = question.formType;
      return question;
    });

    //group by pages in order to build the pages
    let groupedSurvey = commonFactory.groupBy(survey.questions, 'service');
    let pages = [];

    Object.keys(groupedSurvey).forEach((element) => {
      let value = groupedSurvey[element];
      let page = {
        questions: value
      }
      pages.push(page);
    });

    $scope.completeSurvey = survey;

    Survey.Survey.cssType = "bootstrap";


    var surveyModel = new Survey.Model({
      title: survey.surveyName,
      pages: pages
    });

    surveyModel.showProgressBar = "top";
    surveyModel.pagePrevText = "Atras";
    surveyModel.pageNextText = "Siguiente";
    surveyModel.completeText = "Completar encuesta";
    surveyModel.completedHtml = "<h5>Gracias por completar la encuesta! </h5>"

    $(".survey").Survey({
      model: surveyModel,
      css: surveyCustomCSS,
      onComplete: sendDataToServer
    });
  }

  let surveyCustomCSS = {
    root: "survey-container",
    row: "row-separator",
    pageTitle: "sv_p_title",
    question: {
      root: "sv_q",
      title: "sv_q_title"
    },
    checkbox: {
      root: 'sv_q_checkbox'
    },
    radiogroup: {
      root: 'sv_q_radiogroup'
    },
    rating: {
      root: 'sv_q_rating',
      item: 'sv_q_rating_item'
    },
    navigationButton: "btn  btn-primary"
  };
}



SurveyHandlerController.$inject = ['$rootScope', '$scope', '$http', '$stateParams', 'commonFactory'];
angular.module('app').controller('surveyHandlerController', SurveyHandlerController);
