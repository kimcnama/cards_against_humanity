const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
require('./join-patch.js');
let send = undefined;
const TABLE_NAME = "GameStates";
const ANSWERS_TABLE_NAME = "Answers";
const ANSWER_STAGING_DB_NAME = "AnswerStaging";
const MAX_ROUND_LIMIT_SECS = 90;

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

function notifyPlayersOfPlayerAnswer(connectionIds, playerName) {
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

function pushAnswerStaging(roomName, connectionId, answerStruct, id) {
   return ddb.put({
      TableName: ANSWER_STAGING_DB_NAME,
      Item: {
         RoomName: roomName,
         connectionId: connectionId,
         answerJSON: answerStruct,
         id: id,
      },
   }).promise();
}

function getAnswersStaging(roomName) {
   return ddb.scan({
      TableName: ANSWER_STAGING_DB_NAME,
      FilterExpression: "#rn = :roomNm",
      ExpressionAttributeNames: {
         "#rn": "RoomName",
      },
      ExpressionAttributeValues: {
         ":roomNm": roomName,
      }
   }).promise();
}

function deleteStagingAnswers(roomName) {
   console.log('deleting staging answers for: ', roomName);
   getAnswersStaging(roomName).then((answerData) => {
      for (var i = 0; i<answerData.Count; i++) {
         var params = {
           TableName: ANSWER_STAGING_DB_NAME,
           Key: {
              "RoomName": roomName,
              "connectionId": answerData.Items[i].connectionId,
           },
          };
          ddb.delete(params, function(err, data) {
              if (err) {
                  console.error("Unable to gateway item. Error JSON:", JSON.stringify(err, null, 2));
              } else {
                  console.log("DeleteItem gateway succeeded:", JSON.stringify(data, null, 2));
              }
          });  
      }
   });
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

// unbiased shuffle algorithm is the Fisher-Yates
function getRandomCardNotDealt(cards, cardDealtList) {
  var currentIndex = cards.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = cards[currentIndex];
    cards[currentIndex] = cards[randomIndex];
    cards[randomIndex] = temporaryValue;
    
    if (!cardDealtList.includes(cards[currentIndex].id)) {
         cardDealtList.push(cards[currentIndex].id);
         console.log('new card not played found', cards[currentIndex]);
         return cards[currentIndex];
      }
  }

   // out of random cards
  return {id: '-1', answer: 'No answer cards left. Please enter an answer to current Q.', group: 'error'};
}

function sendRoundLenLeft(connId, secs) {
   let secsRound = Math.round(secs);
   send(connId, JSON.stringify({
      eventType: 'roundLenTimeLeft',
      secs: secsRound,
   }));
}

function processAnswer(connectionId, answer, answerToNextQuestion, group, addToDB, roomName, answerId, playerName, forceNextRound) {
   return getAvailableGameSession(roomName).then((data) => {
      console.log("Game session data: %j", data);
      
      if (forceNextRound === true) {
         console.log('attempting to force next round');
         let roundStartTime = data.Items[0].roundStart;
         let timeDiffSecs = (Date.now() - roundStartTime) / 1000;
         if (timeDiffSecs < MAX_ROUND_LIMIT_SECS) {
            sendRoundLenLeft(connectionId, MAX_ROUND_LIMIT_SECS - timeDiffSecs);
            console.log('not enough time elapsed to force next round');
            return;
         }
      }
      
      var id = answerId;
      
      if (addToDB === true) {
         console.log("Adding new answer to answer DB");
         id = String(Date.now() + Math.floor(Math.random() * 10000));
         addNewAnswersDBEntry(id, answer, group);
      }
      
      if (answerToNextQuestion === true) {
         
         console.log("Adding answer to answer pool");
         
         let roundAns = {"connectionId": connectionId, "playerName": playerName, "answerStruct": {"answer": answer, "id": id}}
         
         pushAnswerStaging(roomName, connectionId, roundAns, id).then(() => {
            
            getAnswersStaging(roomName).then((stagingAnswers) => {
               
               console.log("stagingAnswers", stagingAnswers);
               
               var lastPlayer = false;
               
               if (stagingAnswers.Count < data.Items[0].numPlayers - 1) {
                  console.log("Not enough answers submitted to proceed yet");
               } else {
                  lastPlayer = true;
               }
               
               if (forceNextRound === true) {
                  lastPlayer = true;
               }
               
               var fieldsToUpdate = [];
               var fieldValues = [];
               
               if (lastPlayer) {
                  var _roundAnswers = [];
                  var answerIdsStaging = [];
                  for (var a = 0; a < stagingAnswers.Count; a++) {
                     _roundAnswers.push(stagingAnswers.Items[a].answerJSON);
                     answerIdsStaging.push(stagingAnswers.Items[a].id);
                  }
                  
                  if (forceNextRound === false) {
                     fieldsToUpdate.push("roundAnswers");
                     fieldValues.push(_roundAnswers);
                     
                     fieldsToUpdate.push("answerSubmitted");
                     var _answersSubmitted = data.Items[0].answerSubmitted.concat(answerIdsStaging);
                     fieldValues.push(_answersSubmitted);
                  }
               }
               
               if (addToDB === false) {
                  getAnswerCards(group).then((answersData) => {
               
                     fieldsToUpdate.push("answersDealt");
               
                     var cardDealtList = data.Items[0].answersDealt;
                     
                     var cardToSendToUser = getRandomCardNotDealt(answersData.Items, cardDealtList);
                     
                     fieldValues.push(cardDealtList);
                     
                     send(connectionId, JSON.stringify({
                        eventType: 'pushNewCardToUser',
                        card: cardToSendToUser,
                     }));
                     
                     for (var i = 0; i<fieldsToUpdate.length; i++) {
                         if (i === fieldsToUpdate.length - 1) {
                            console.log("answers needed", data.Items[0].numPlayers - 1);
                            if (lastPlayer) {
                               console.log("enough answers in, next round");
                               pushNextRound(data.Items[0].playerIds, _roundAnswers);
                               deleteStagingAnswers(roomName);
                            } else {
                               notifyPlayersOfPlayerAnswer(data.Items[0].playerIds, playerName);
                            }
                             return updateDBGameInstance(data.Items[0].RoomName, fieldsToUpdate[i], fieldValues[i]);
                         } else {
                            var voidVal = updateDBGameInstance(data.Items[0].RoomName, fieldsToUpdate[i], fieldValues[i]); 
                         }
                     }
                     
                  });
               } else {
                  for (var i = 0; i<fieldsToUpdate.length; i++) {
                         if (i === fieldsToUpdate.length - 1) {
                            console.log("answers needed", data.Items[0].numPlayers - 1);
                            if (lastPlayer) {
                               console.log("enough answers in, next round");
                               pushNextRound(data.Items[0].playerIds, _roundAnswers);
                               deleteStagingAnswers(roomName);
                            } else {
                               notifyPlayersOfPlayerAnswer(data.Items[0].playerIds, playerName);
                            }
                             return updateDBGameInstance(data.Items[0].RoomName, fieldsToUpdate[i], fieldValues[i]);
                         } else {
                            var voidVal = updateDBGameInstance(data.Items[0].RoomName, fieldsToUpdate[i], fieldValues[i]); 
                         }
                     }
               } 
            });
         });
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
         }).catch((err) => {
            console.log('error updating game instance:', err);  
         }
         );
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
   
   let forceNextRound = body.forceNextRound;
   console.log("playerName: %j", playerName);

   processAnswer(connectionIdForCurrentRequest, answer, answerToNextQuestion, group, addToDB, roomName, answerId, playerName, forceNextRound).then(() => {
      callback(null, {
         statusCode: 200
      });
   });
};