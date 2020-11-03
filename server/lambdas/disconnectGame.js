const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
require('./disconnect-patch.js');
const TABLE_NAME = "GameStates";
const GATEWAY_TABLE_NAME = "GatewayConnections";
const ANSWER_STAGING_DB_NAME = "AnswerStaging";
let dissconnectWs = undefined;
let wsStatus = undefined;
let send = undefined;

function init(event) {
    console.log(event)
    const apigwManagementApi = new AWS.ApiGatewayManagementApi({ apiVersion: '2018-11-29', endpoint: event.requestContext.domainName + '/' + event.requestContext.stage });
    
    send = async (connectionId, data) => {
      await apigwManagementApi.postToConnection({
         ConnectionId: connectionId,
         Data: `${data}`
      }).promise();
   }
    
    dissconnectWs = async(connectionId) => {
        await apigwManagementApi.deleteConnection({ ConnectionId: connectionId }).promise();
    }
}

function deleteStagingAnswers(roomName) {
    let params = {
        TableName: ANSWER_STAGING_DB_NAME,
        Key: {
           "RoomName": roomName,
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

function getGameSession(connectionId) {
    return ddb.scan({
        TableName: TABLE_NAME,
        FilterExpression: "contains (playerIds, :connId)",
        ExpressionAttributeValues: {
            ":connId": connectionId
        }
    }).promise();
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

function removeGatewayConn(connId) {
    let params = {
        TableName: GATEWAY_TABLE_NAME,
        Key: {
           "connectionId": connId,
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

function getPlayerNameFromRow(row, connId) {
    for (var i = 0; i < row.players.length; i++) {
        if (row.players[i].connectionId === connId) {
            return row.players[i].playerName;
        }
    }
    return "A player";
}

function notifyPlayersOfPlayerDisconnect(connectionIds, playerName) {
   for (var i = 0; i<connectionIds.length; i++) {
      send(connectionIds[i], playerName + " joined the room!");
   }
}

exports.handler = (event, context, callback) => {
    console.log("Disconnect event received: %j", event);
    init(event);

    const connectionIdForCurrentRequest = event.requestContext.connectionId;
    console.log("Request from player: " + connectionIdForCurrentRequest);
    
    removeGatewayConn(connectionIdForCurrentRequest);

    getGameSession(connectionIdForCurrentRequest).then((data) => {
        console.log("getGameSession: " + data.Items[0]);

        if (data.Items[0].numPlayers <= 1) {
            let params = {
                TableName: TABLE_NAME,
                Key: {
                   "RoomName": data.Items[0].RoomName,
                },
            };
            ddb.delete(params, function(err, data) {
                if (err) {
                    console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
                }
            });
            deleteStagingAnswers(data.Items[0].RoomName);
        } else {
            let playerName = getPlayerNameFromRow(data.Items[0], connectionIdForCurrentRequest);
            console.log("removing " + playerName + " from game");
         
             let fieldsToUpdate = ["players", "playerIds", "numPlayers"];
             var fieldValues = [];
             
             let playersCopy = data.Items[0].players;
             var updatePlayersList = [];
             for (var i = 0; i<playersCopy.length; i++) {
                 if (playersCopy[i].connectionId === connectionIdForCurrentRequest) {
                     var item = playersCopy[i];
                     item.isPlaying = false;
                     updatePlayersList.push(item);
                 } else {
                     updatePlayersList.push(playersCopy[i]);
                 }
             }
             fieldValues.push(updatePlayersList);
             
             console.log("updatePlayersList " + updatePlayersList);
             
             let playerIdsCopy = data.Items[0].playerIds;
             var updatePlayerIds = [];
             for (var i = 0; i<playerIdsCopy.length; i++) {
                 if (playersCopy[i].connectionId !== connectionIdForCurrentRequest) {
                     updatePlayerIds.push(playerIdsCopy[i]);
                 }
             }
             fieldValues.push(updatePlayerIds);
             
             console.log("updatePlayerIds " + updatePlayerIds);
             
             var _numPlayers = data.Items[0].numPlayers - 1;
             fieldValues.push(_numPlayers);
             
             console.log("_numPlayers " + _numPlayers);
             
             for (var i = 0; i<fieldsToUpdate.length; i++) {
                var voidVal = updateDBGameInstance(data.Items[0].RoomName, fieldsToUpdate[i], fieldValues[i]); 
             }
             
            //notifyPlayersOfPlayerDisconnect(updatePlayerIds, playerName + " has left the room");
        }
    }).catch((err) => {
        console.log("Disconect failed trying to update DB game instance", err);
    });
    
    //TODO: player x disconnected
        dissconnectWs(connectionIdForCurrentRequest).then(() => {}, (err) => {
            console.log("Error closing connection, player 1 probably already closed.");
            console.log(err);
        });

    return callback(null, { statusCode: 200, });
}