const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
require('./join-patch.js');
let send = undefined;
const TABLE_NAME = "GameStates";
const TABLE_NAME_QUESTIONS = "Questions";

function init(event) {
   const apigwManagementApi = new AWS.ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
   });
   send = async (connectionId, data) => {
      await apigwManagementApi.postToConnection({
         ConnectionId: connectionId,
         Data: `${data}`
      }).promise();
   }
}

function getAvailableGameSession(roomName) {
   return ddb.scan({
      TableName: TABLE_NAME,
      FilterExpression: "#rn = :roomNm",
      ExpressionAttributeNames: {
         "#rn": "RoomName",
      },
      ExpressionAttributeValues: {
         ":roomNm": roomName,
      }
   }).promise();
}

function getNextQuestion(groupName) {
   return ddb.scan({
      TableName: TABLE_NAME_QUESTIONS,
      FilterExpression: "#gr = :groupNm OR #gr = standard",
      ExpressionAttributeNames: {
         "#gr": "group",
      },
      ExpressionAttributeValues: {
         ":groupNm": groupName,
      }
   }).promise();
}

function notifyPlayersOfSelection(connectionIds, playerWinner, winningAnswer, nextQuestion, players) {
   let msg = JSON.stringify({
      eventType: 'selectionRoundComplete',
      body: {
         winner: playerWinner,
         winningAnswer: winningAnswer,
         nextQuestion: nextQuestion,
         scores: players
      },
   });
   for (var i = 0; i<connectionIds.length; i++) {
      send(connectionIds[i], msg).then();
   }
}

function notifyUsersOfRoundHost(connectionIds, hostId) {
   let msg = JSON.stringify({
      eventType: 'currentRoundHost',
      hostConnectionId: hostId,
   });
   for (var i = 0; i<connectionIds.length; i++) {
      send(connectionIds[i], msg).then();
   }
}

function processAnswer(connectionId, roomName, winnerConnectionId, groupName) {
   return getAvailableGameSession(roomName).then((data) => {
       
      console.log("Game session data: %j", data);
      
      notifyUsersOfRoundHost(data.Items[0].playerIds, winnerConnectionId);
      
      var playerName = " ";
      var winningAnswer = " ";
      var _players = data.Items[0].players
      // get player name and answer
      console.log("Round answers", data.Items[0].roundAnswers);
      console.log("winnerConnectionId", winnerConnectionId);
      for (var i = 0; i<data.Items[0].roundAnswers.length; i++) {
          if (data.Items[0].roundAnswers[i].connectionId.includes(winnerConnectionId)) {
              winningAnswer = data.Items[0].roundAnswers[i].answerStruct.answer;
              break;
          }
      }
      console.log("winning answer", winningAnswer);
      console.log("_players", _players);
      for (var i = 0; i<_players.length; i++) {
          if (_players[i].connectionId.includes(winnerConnectionId)) {
              playerName = _players[i].playerName;
              _players[i].playerWins = _players[i].playerWins + 1;
              break;
          }
      }
      console.log("winning player", playerName);
         
     let fieldsToUpdate = ["players", "roundHost", "roundAnswers", "numAnswersIn", "roundsPlayed", "roundStart", "nextQuestions", "currentQuestion", "questionsAsked"];
     var fieldValues = [];
     
     // increment player wins
     fieldValues.push(_players);
         
    // update round host
     fieldValues.push(winnerConnectionId);
     
     // update round answer
     fieldValues.push([]);
     
     // numAnswersIn
     fieldValues.push(0);
     
     // roundsPlayed
     fieldValues.push(data.Items[0].roundsPlayed + 1);
     
     // roundStart
     fieldValues.push(Date.now());
     
     var nextQuestion = "";
    var nextQuestionId = "";
     // nextQuestions
     if (data.Items[0].nextQuestions === []) {
         fieldValues.push([]);
     } else {
         var nextQuestionNewList = []
         for (var i = 0; i<data.Items[0].nextQuestions.length; i++) {
             if (i === 0) {
                 nextQuestion = data.Items[0].nextQuestions[i].question;
                 nextQuestionId = data.Items[0].nextQuestions[i].id;
             } else {
                 nextQuestionNewList.push(data.Items[0].nextQuestions[i]);
             }
         }
         fieldValues.push(nextQuestionNewList);
         
     }
     
     var questionAskedId = "";
     var questionsAskedList = data.Items[0].questionsAsked;
     // currentQuestion && id
     if (nextQuestion !== "") {
         fieldValues.push(nextQuestion);
         fieldValues.push(nextQuestionId);
         questionsAskedList.push(questionAskedId);
         return updateDBinstance(fieldsToUpdate, fieldValues, nextQuestion, questionsAskedList, data, playerName, winningAnswer, _players);
     } else {
         getNextQuestion(groupName).then((questionData) => {
            console.log("questionData", questionData);
              if (questionData && questionData.Count > 0) {
                  var indexNextQ = Math.floor(Math.random() * questionData.Count);
                  nextQuestion = questionData.Items[indexNextQ].question;
                  questionAskedId = questionData.Items[indexNextQ].id;
                  questionsAskedList.push(questionAskedId);
              }
              return updateDBinstance(fieldsToUpdate, fieldValues, nextQuestion, questionsAskedList, data, playerName, winningAnswer, _players);
         });
      
     }
   });
}

function updateDBinstance(fieldsToUpdate, fieldValues, nextQuestion, questionsAskedIdList, data, playerName, winningAnswer, gamePlayers) {
   fieldValues.push(nextQuestion);
   fieldValues.push(questionsAskedIdList);
   
   console.log("fieldsToUpdate", fieldsToUpdate);
     console.log("field values", fieldValues);
         
     for (var i = 0; i<fieldsToUpdate.length; i++) {
         if (i === fieldsToUpdate.length - 1) {
            notifyPlayersOfSelection(data.Items[0].playerIds, playerName, winningAnswer, nextQuestion, gamePlayers);
             return updateDBGameInstance(data.Items[0].RoomName, fieldsToUpdate[i], fieldValues[i]);
         } else {
            var voidVal = updateDBGameInstance(data.Items[0].RoomName, fieldsToUpdate[i], fieldValues[i]); 
         }
     }
}

function updateDBGameInstance(roomNm, field, value) {
    return ddb.update({
            TableName: TABLE_NAME,
            Key: {
               "RoomName": roomNm
            },
            UpdateExpression: "set " + field + " = :val",
            ExpressionAttributeValues: {
               ":val": value,
            }
         }).promise().then(() => {
            console.log("DB game instance field: " + field + "updated");
         });
}

exports.handler = (event, context, callback) => {
   console.log("Event received: %j", event);
   init(event);
   
   let connectionIdForCurrentRequest = event.requestContext.connectionId;
   console.log("Current connection id: " + connectionIdForCurrentRequest);

   let body = JSON.parse(event.body);
   
   let winnerConnId = body.winnerConnectionId;
   console.log("winnerConnectionId: %j", winnerConnId);
   
   let roomNm = body.roomName;
   console.log("roomName: %j", roomNm);
   
   let groupName = body.groupName;
   console.log("groupName: %j", groupName);
   
   processAnswer(connectionIdForCurrentRequest, roomNm, winnerConnId, groupName).then(() => {
      callback(null, {
         statusCode: 200
      });
   });
};