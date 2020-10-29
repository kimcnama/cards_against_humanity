const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
require('./join-patch.js');
const TABLE_NAME = "GatewayConnections";
const PLAYING_OP = "11";

function init(event) {
   const apigwManagementApi = new AWS.ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
   });
}

function getConnections(connectionId) {
   return ddb.scan({
      TableName: TABLE_NAME,
      FilterExpression: "#cn = :connId",
      ExpressionAttributeNames: {
         "#cn": "connectionId",
      },
      ExpressionAttributeValues: {
         ":connId": connectionId,
      }
   }).promise();
}

function addConnectionId(connectionId) {
   return getConnections(connectionId).then((data) => {
      console.log("Game session data: %j", data);

      if (data && data.Count < 1) {
         // create new game session 
         console.log("No sessions exist, creating session...");

         return ddb.put({
            TableName: TABLE_NAME,
            Item: {
               connectionId: connectionId,
               connectionTime: Date.now(),
            },
         }).promise();
      } else {
         console.log("Session exists, adding player2 to existing session");

         return ddb.update({
            TableName: TABLE_NAME,
            Key: {
               "connectionId": data.Items[0].connectionId // just grap the first result, as there should only be one
            },
            UpdateExpression: "set connectionId = :connId",
            ExpressionAttributeValues: {
               ":connId": connectionId
            }
         }).promise().then(() => {
         });
      }
   });
}

exports.handler = (event, context, callback) => {
    console.log("event", event);
   const connectionId = event.requestContext.connectionId;
   console.log("Connect event received: %j", event);
   init(event);

   addConnectionId(connectionId).then(() => {
      callback(null, {
         statusCode: 200
      });
   });
}