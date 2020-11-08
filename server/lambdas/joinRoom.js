const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
require('./join-patch.js');
let send = undefined;
const TABLE_NAME = "GameStates";
const ANSWERS_TABLE = "Answers";
const QUESTIONS_TABLE = "Questions";
const HAND_SIZE = 6;

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

function getRandomQuestion() {
   return ddb.scan({
      TableName: QUESTIONS_TABLE,
      FilterExpression: "#gr = :std",
      ExpressionAttributeNames: {
         "#gr": "group",
      },
      ExpressionAttributeValues: {
         ":std": "standard",
      }
   }).promise();
}

function getAnswerCards(groupName) {
   return ddb.scan({
      TableName: ANSWERS_TABLE,
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

function notifyPlayersOfPlayerJoin(connectionIds, playersStruct) {
   var playersList = [];
   for (var j = 0; j<playersStruct.length; j++) {
      playersList.push(playersStruct[j].playerName);
   }
   let msg = JSON.stringify({
      eventType: "activePlayers",
      players: playersList,
   })
   for (var i = 0; i<connectionIds.length; i++) {
      send(connectionIds[i], msg);
   }
}

function sendQuestion(connId, _question) {
   send(connId, JSON.stringify({
      eventType: "initialQuestion",
      question: _question,
   }));
}

function sendHandToUser(connId, hand) {
   send(connId, JSON.stringify({
      eventType: "initialAnswerCards",
      answers: hand,
   }));
}

function notifyUserOfRoundHost(connId, hostId, hostName) {
   let msg = JSON.stringify({
      eventType: 'currentRoundHost',
      hostConnectionId: hostId,
      hostName: hostName,
      forcedNextRound: false,
   });
   send(connId, msg);
}

function addPlayerToRoom(connectionId, roomName, playerName, groupName) {
   return getAvailableGameSession(roomName).then((data) => {
      console.log("Game session data: %j", data);

      if (data && data.Count < 1) {
         // create new game session 
         console.log("No sessions exist, creating session...");

         console.log("Connection ID connecting", connectionId);
         
         
         getRandomQuestion().then((questionData) => {
            let randQInd = Math.floor(Math.random() * questionData.Count);
            let question = questionData.Items[randQInd].question;
            let questionId = questionData.Items[randQInd].id;
            sendQuestion(connectionId, question);
            
            getAnswerCards(groupName).then((answersData) => {
               
               var cardDealtList = [];
               var cardsToSendToUser = [];
               for (var j = 0; j<HAND_SIZE; j++) {
                  for (var k = 0; k<answersData.Count; k++) {
                     if (!cardDealtList.includes(answersData.Items[k].id)) {
                        cardDealtList.push(answersData.Items[k].id);
                        cardsToSendToUser.push(answersData.Items[k]);
                        break;
                     }
                  }
               }
               
               sendHandToUser(connectionId, cardsToSendToUser);
               notifyUserOfRoundHost(connectionId, connectionId, playerName);
               
               return ddb.put({
                  TableName: TABLE_NAME,
                  Item: {
                     RoomName: roomName,
                     playerIds: [connectionId],
                     players: [{"connectionId": connectionId, "playerName": playerName, "playerWins": 0, "isPlaying": true}],
                     numPlayers: 1,
                     roundHost: connectionId,
                     roundHostName: playerName,
                     roundAnswers: [],
                     numAnswersIn: 0,
                     answerSubmitted: [],
                     roundsPlayed: 0,
                     roundStart: Date.now(),
                     currentQuestion: question,
                     nextQuestions: [],
                     questionsAsked: [questionId],
                     answersDealt: cardDealtList,
                  },
               }).promise();
            });
         });
      } else {
         // add player to existing session as player2
         console.log("Session exists, adding player2 to existing session");
         
         console.log("print of data fetched: ", data);
         
         let dataParsed = data.Items[0];
         
         console.log("list of connection ids: ", dataParsed);
         
         if (dataParsed.playerIds.includes(connectionId)) {
            let errorMsg = JSON.stringify({
               eventType: 'error',
               message: playerName + " already exists!",
            })
            send(connectionId, errorMsg);
            return;
         }
         
         sendQuestion(connectionId, data.Items[0].currentQuestion);
         
         notifyUserOfRoundHost(connectionId, dataParsed.roundHost, dataParsed.roundHostName);
         
         let fieldsToUpdate = ["players", "playerIds", "numPlayers", "answersDealt"];
         var fieldValues = [];
         
         var _players = dataParsed.players;
         _players.push({"connectionId": connectionId, "playerName": playerName, "playerWins": 0, "isPlaying": true});
         fieldValues.push(_players);
         
         var _playerIds = dataParsed.playerIds;
         _playerIds.push(connectionId);
         fieldValues.push(_playerIds);
         
         var _numPlayers = dataParsed.numPlayers + 1;
         fieldValues.push(_numPlayers);
         
         getAnswerCards(groupName).then((answersData) => {
            
            var cardDealtList = data.Items[0].answersDealt;
            var cardsToSendToUser = [];
            for (var j = 0; j<HAND_SIZE; j++) {
               for (var k = 0; k<answersData.Count; k++) {
                  if (!cardDealtList.includes(answersData.Items[k].id)) {
                     cardDealtList.push(answersData.Items[k].id);
                     cardsToSendToUser.push(answersData.Items[k]);
                     break;
                  }
               }
            }
            
            fieldValues.push(cardDealtList);
               
            sendHandToUser(connectionId, cardsToSendToUser);
            
            for (var i = 0; i<fieldsToUpdate.length; i++) {
             if (i === fieldsToUpdate.length - 1) {
                 notifyPlayersOfPlayerJoin(dataParsed.playerIds, _players);
                 return updateDBGameInstance(data.Items[0].RoomName, fieldsToUpdate[i], fieldValues[i]);
             } else {
                var voidVal = updateDBGameInstance(data.Items[0].RoomName, fieldsToUpdate[i], fieldValues[i]); 
             }
         }
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
         });
}

exports.handler = (event, context, callback) => {
   console.log("Event received: %j", event);
   init(event);
   
   let connectionIdForCurrentRequest = event.requestContext.connectionId;
   console.log("Current connection id: " + connectionIdForCurrentRequest);
   
   send(connectionIdForCurrentRequest, JSON.stringify({
      eventType: "playerMessage",
      message: "Joining Room!",
   }));
   
   send(connectionIdForCurrentRequest, JSON.stringify({
      eventType: "yourConnectionId",
      message: connectionIdForCurrentRequest,
   }));

   let body = JSON.parse(event.body);

   let roomName = body.roomName;
   console.log("roomName: %j", roomName);
   
   let playerName = body.playerName;
   console.log("playerName: %j", playerName);
   
   let groupName = body.groupName;
   console.log("groupName: %j", groupName);
   
   addPlayerToRoom(connectionIdForCurrentRequest, roomName, playerName, groupName).then(() => {
      
      callback(null, {
         statusCode: 200
      });
   });
};