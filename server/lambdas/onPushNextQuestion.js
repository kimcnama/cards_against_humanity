const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
require('./join-patch.js');
const TABLE_NAME = "GameStates";
const TABLE_NAME_QUESTIONS = "Questions";
const PLAYING_OP = "11";

function init(event) {
   const apigwManagementApi = new AWS.ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
   });
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

function pushQuestionToDB(_id, _question, _group) {
    console.log("pushing " + _question + " to DB");
   return ddb.put({
            TableName: TABLE_NAME_QUESTIONS,
            Item: {
               id: _id,
               question: _question,
               group: _group,
            },
         }).promise();
}

function pushQuestion(question, group, roomName) {
    
    let id = String(Date.now() + Math.floor(Math.random() * 10000));
    pushQuestionToDB(id, question, group).then();
    
   return getAvailableGameSession(roomName).then((data) => {
      console.log("Game session data: %j", data);

      if (data && data.Count > 0) {
          // update game state DB
          
          var nextQsList = data.Items[0].nextQuestions;
          nextQsList.push({"id": id, "question": question});
          
         return ddb.update({
            TableName: TABLE_NAME,
            Key: {
               "RoomName": roomName
            },
            UpdateExpression: "set nextQuestions = :val",
            ExpressionAttributeValues: {
               ":val": nextQsList,
            }
         }).promise().then(() => {
            console.log("DB game instance field: nextQuestions updated");
         });
      }
   });
}

exports.handler = (event, context, callback) => {
    console.log("event", event);
   const connectionId = event.requestContext.connectionId;
   console.log("Connect event received: %j", event);
   init(event);
   
   let body = JSON.parse(event.body);
   
   let question = body.question;
   console.log("question: %j", question);
   
   let group = body.groupName;
   console.log("group: %j", group);
   
   let roomName = body.roomName;
   console.log("roomName: %j", roomName);

   pushQuestion(question, group, roomName).then(() => {
      callback(null, {
         statusCode: 200
      });
   });
}