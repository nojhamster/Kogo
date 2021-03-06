
/**
 * Kogo (http://www.kogo.hedonsoftware.com/)
 *
 * @link      https://github.com/HedonSoftware/Kogo for the canonical source repository
 * @copyright Copyright (c) 2014 HedonSoftware Limited (http://www.hedonsoftware.com)
 * @license   https://github.com/HedonSoftware/Kogo/blob/master/LICENSE.md Proprietary software
 */

var logger  = require(LIBRARY_PATH + '/logger');
var http    = require('http');
var request = require('request');
var _       = require('underscore');

exports.getAll = function (req, res){

  logger.info('Request.' + req.url);

  var queryUrl = '/ticket-links' +

    // ticket link fields
    '?fields[]=tl.ticketId&fields[]=tl.projectId&fields[]=tl.boardId' +
    '&fields[]=tl.sprintId&fields[]=tl.laneId' +

    // joined ticket field
    '&fields[t.name]=ticketName&fields[]=t.storyPoints' +

    // joined project fields
    '&fields[p.name]=projectName&fields[p.code]=projectCode' +

    // joined board fields
    '&fields[b.name]=boardName' +

    // joined sprint fields
    '&fields[s.name]=sprintName' +

    // joined lane fields
    '&fields[l.name]=laneName' +

    // joins
    '&joins[]=ticket' +
    '&joins[]=project' +
    '&joins[]=board' +
    '&joins[]=sprint' +
    '&joins[]=lane';

  if (!_.isEmpty(req.query)) {
    var value = null;
    var conditions = [];
    for (var field in req.query) {
      value = req.query[field];
      if (_.isString(value)) {
        conditions.push('conditions[' + field + ']=' + value);
      }
    }

    queryUrl += '&' + conditions.join('&');
  }

  var options = {
    host: 'localhost',
    port: 3001,
    path: queryUrl
  };

  http.get(options, function (response){
    response.setEncoding('utf-8');

    var responseString = '';

    response.on('data', function (data) {
      responseString += data;
    });

    response.on('end', function () {
      res.status(200).send(responseString);
    });

  }).on('error', function (e){
    return res.json(500, 'Internal Server Error');
  });
};

exports.update = function (req, res){
  logger.info('Request.' + req.url);

  var queryUrl = '/ticket-links/' + req.params.ticketId;

  var options = {
      url: 'http://localhost:3001' + queryUrl,
      body: req.body,
      json: true,
      method: 'put'
  };

  request(options, function (error, response, body){
    return res.json(200, body);
  });
};
