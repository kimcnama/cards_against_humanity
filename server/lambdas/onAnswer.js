const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
require('./join-patch.js');
let send = undefined;
const TABLE_NAME = "GameStates";
const ANSWERS_TABLE_NAME = "Answers";

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

function addNewAnswersDBEntry(id, answer, group) {
   return ddb.put({
            TableName: ANSWERS_TABLE_NAME,
            Item: {
               id: id,
               answer: answer,
               group: group,
            },
         }).promise();
}

function notifyPlayersOfAnswer(connectionIds, peopleAnswered, totPeopleToAnswer) {
   let msg = JSON.stringify({
      eventType: "playerMessage",
      message: String(peopleAnswered) + "/" + String(totPeopleToAnswer) + " answers submitted!",
   });
   for (var i = 0; i<connectionIds.length; i++) {
      send(connectionIds[i], msg).then();
   }
}

function NotifyPlayersOfPlayerAnswer(connectionIds, playerName) {
   let msg = JSON.stringify({
      eventType: "playerAnswered",
      player: playerName,
   });
   for (var i = 0; i<connectionIds.length; i++) {
      send(connectionIds[i], msg).then();
   }
}

function pushNextRound(connectionIds, answersJSON) {
   let msg = JSON.stringify({
      eventType: 'submissionRoundComplete',
      answers: answersJSON,
   });
   console.log("Next round msg", msg);
   for (var i = 0; i<connectionIds.length; i++) {
      send(connectionIds[i], msg).then();
   }
}

function getAnswerCards(groupName) {
   return ddb.scan({
      TableName: ANSWERS_TABLE_NAME,
      FilterExpression: "#gr = :std OR #gr = :groupNm",
      ExpressionAttributeNames: {
         "#gr": "group",
      },
      ExpressionAttributeValues: {
         ":std": "standard",
         ":groupNm": groupName,
      }
   }).promise();
}

function processAnswer(connectionId, answer, answerToNextQuestion, group, addToDB, roomName, answerId, playerName) {
   return getAvailableGameSession(roomName).then((data) => {
      console.log("Game session data: %j", data);
      
      var id = answerId;
      
      if (addToDB === true) {
         console.log("Adding new answer to answer DB");
         id = String(Date.now() + Math.floor(Math.random() * 10000));
         addNewAnswersDBEntry(id, answer, group);
      }
      
      if (answerToNextQuestion === true) {
         console.log("Adding answer to answer pool");
         
         var fieldsToUpdate = ["numAnswersIn", "roundAnswers", "answerSubmitted"];
         var fieldValues = [];
         
         let _numAnswersIn = data.Items[0].numAnswersIn + 1;
         fieldValues.push(_numAnswersIn);
         
         var _roundAnswers = data.Items[0].roundAnswers;
         _roundAnswers.push({"connectionId": connectionId, "answerStruct": {"answer": answer, "id": id}});
         fieldValues.push(_roundAnswers);
         
         var _answersSubmitted = data.Items[0].answerSubmitted;
         _answersSubmitted.push(id);
         fieldValues.push(_answersSubmitted);
         
         if (addToDB === false) {
            getAnswerCards(group).then((answersData) => {
         
               fieldsToUpdate.push("answersDealt");
         
               var cardDealtList = data.Items[0].answersDealt;
               var cardToSendToUser = {};
               for (var k = 0; k<answersData.Count; k++) {
                  if (!cardDealtList.includes(answersData.Items[k].id)) {
                     cardDealtList.push(answersData.Items[k].id);
                     cardToSendToUser = answersData.Items[k];
                     break;
                  }
               }
               
               fieldValues.push(cardDealtList);
               
               send(connectionId, JSON.stringify({
                  eventType: 'pushNewCardToUser',
                  card: cardToSendToUser,
               }));
               for (var i = 0; i<fieldsToUpdate.length; i++) {
                if (i === fieldsToUpdate.length - 1) {
                   console.log("answers in", _numAnswersIn);
                   console.log("answers needed", data.Items[0].numPlayers - 1);
                   if (_numAnswersIn >= data.Items[0].numPlayers - 1) {
                      console.log("enough answers in, next round");
                      pushNextRound(data.Items[0].playerIds, _roundAnswers);
                   } else {
                      NotifyPlayersOfPlayerAnswer(data.Items[0].playerIds, playerName);
                      notifyPlayersOfAnswer(data.Items[0].playerIds, _numAnswersIn, data.Items[0].numPlayers - 1);
                   }
                    return updateDBGameInstance(data.Items[0].RoomName, fieldsToUpdate[i], fieldValues[i]);
                } else {
                   var voidVal = updateDBGameInstance(data.Items[0].RoomName, fieldsToUpdate[i], fieldValues[i]); 
                }
            }
               
            })
      } else {
         for (var i = 0; i<fieldsToUpdate.length; i++) {
                if (i === fieldsToUpdate.length - 1) {
                   console.log("answers in", _numAnswersIn);
                   console.log("answers needed", data.Items[0].numPlayers - 1);
                   if (_numAnswersIn >= data.Items[0].numPlayers - 1) {
                      console.log("enough answers in, next round");
                      pushNextRound(data.Items[0].playerIds, _roundAnswers);
                   } else {
                      NotifyPlayersOfPlayerAnswer(data.Items[0].playerIds, playerName);
                      notifyPlayersOfAnswer(data.Items[0].playerIds, _numAnswersIn, data.Items[0].numPlayers - 1);
                   }
                    return updateDBGameInstance(data.Items[0].RoomName, fieldsToUpdate[i], fieldValues[i]);
                } else {
                   var voidVal = updateDBGameInstance(data.Items[0].RoomName, fieldsToUpdate[i], fieldValues[i]); 
                }
            }
      }
      }
   });
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

   let answer = body.answer;
   console.log("answer: %j", answer);
   
   let answerToNextQuestion = body.answerToNextQuestion;
   console.log("answerToNextQuestion: %j", answerToNextQuestion);
   
   let group = body.groupName;
   console.log("group: %j", group);
   
   let addToDB = body.addToDB;
   console.log("addToDB: %j", addToDB);
   
   let roomName = body.roomName;
   console.log("roomName: %j", roomName);
   
   let answerId = body.id;
   console.log("answerId: %j", answerId);
   
   let playerName = body.playerName;
   console.log("playerName: %j", playerName);
   
   processAnswer(connectionIdForCurrentRequest, answer, answerToNextQuestion, group, addToDB, roomName, answerId, playerName).then(() => {
      callback(null, {
         statusCode: 200
      });
   });
};