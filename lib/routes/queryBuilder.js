
/**
 * Kogo (http://www.kogo.hedonsoftware.com/)
 *
 * @link      https://github.com/HedonSoftware/Kogo for the canonical source repository
 * @copyright Copyright (c) 2014 HedonSoftware Limited (http://www.hedonsoftware.com)
 * @license   https://github.com/HedonSoftware/Kogo/blob/master/LICENSE.md Proprietary software
 */

var _               = require('underscore');
var RouterException = require(LIBRARY_PATH + '/exception');

/**
 * Class definition
 */
function QueryBuilder() {
  this.reset();
}

QueryBuilder.prototype.supportedLogicOperators = [
  'and',
  'or'
];

QueryBuilder.prototype.supportedOrderOperators = [
  'asc',
  'desc'
];

QueryBuilder.prototype.supportedComparisionOperators = [
  'eq',  // Matches values that are exactly the same as the value specified in the query.
  'gt',  // Matches values that are greater than the value specified in the query.
  'gte', // Matches values that are greater than or equal to the value specified in the query.
  'lt',  // Matches values that are less than the value specified in the query.
  'lte', // Matches values that are less than or equal to the value specified in the query.
  'ne',  // Matches all values that are not equal to the value specified in the query.
  'nin', // Matches values that do not exist in an array specified to the query.
  'like' // Matches values that are matching pattern passed in the value specified in the query.
];

/**
 * Lists supported operators lists all valid operators that
 * are identical like MongoDb operators
 */
QueryBuilder.prototype.supportedOperators = [

  // logic operators
  'and',
  'or',

  // comparision operators
  'eq',  // Matches values that are exactly the same as the value specified in the query.
  'gt',  // Matches values that are greater than the value specified in the query.
  'gte', // Matches values that are greater than or equal to the value specified in the query.
  'lt',  // Matches values that are less than the value specified in the query.
  'lte', // Matches values that are less than or equal to the value specified in the query.
  'ne',  // Matches all values that are not equal to the value specified in the query.
  'nin', // Matches values that do not exist in an array specified to the query.
  'like' // Matches values that are matching pattern passed in the value specified in the query.
];

/**
 * Placeholder for parsed query
 * @see this.clear() method that sets defaults
 */
QueryBuilder.prototype.query = {};

/**
 * Placeholder for fields used in query
 * @see this.clear() method that sets defaults
 */
QueryBuilder.prototype.fields = [];

/**
 * Method returns fields used in query
 * @return Array List of fields used in query
 */
QueryBuilder.prototype.getUsedFields = function () {
  return this.fields;
};

/**
 * Method validates and sets limit for query
 * @param integer limit Limit to be set on query
 * @return QueryBuilder this Fluent interface
 * @throws RouterException When passed limit is invalid
 */
QueryBuilder.prototype.setLimit = function (limit) {

  if ((typeof limit != "number" && typeof limit != "string") ||
    parseInt(limit) != limit ||
    limit < 1
  ) {
    throw new RouterException('Invalid limit passed. Positive integer value expected');
  }

  this.query.limit = parseInt(limit);

  return this;
};

/**
 * Setter method for order
 *
 * Accepted object:
 * {
 *   "field1": "desc"
 * }
 *
 * @param object order Order description
 */
QueryBuilder.prototype.setOrder = function (order) {

  if (!_.isObject(order)) {
    throw new RouterException('Invalid order passed');
  }

  var orderOperator = '';
  for (var field in order) {
    orderOperator = order[field];
    if (!_.isString(orderOperator) ||
      !_.contains(this.supportedOrderOperators, orderOperator)
    ) {
      throw new RouterException('Invalid order operator passed');
    }
  }

  this.query.order = order;
};

/**
 * Method sets fields to be retrieved
 * @param array fields List of fields
 * @return QueryBuilder this Fluent interface
 */
QueryBuilder.prototype.setFields = function (fields) {

  if (!_.isArray(fields) && !_.isObject(fields)) {
    throw new RouterException('Invalid list of fields provided');
  }

  var field = null;
  for (var index in fields) {
   field = fields[index];
   if (!_.isString(field)) {
     throw new RouterException('Invalid field passed: ' + field);
   }
  }

  this.query.fields = fields;

  var usedFields = [];
  var value = null;
  for (var key in fields) {

    value = fields[key];

    // if aliased
    if (isNaN(key)) {
      usedFields.push(key);
    } else {
      usedFields.push(value);
    }
  }

  this.fields = usedFields;

  return this;
};

/**
 * Method sets resources to be joined
 * Expected structure:
 * [
 *   user
 * ]
 * @param array resources Description of resources
 * @return QueryBuilder this Fluent interface
 */
QueryBuilder.prototype.setJoins = function (resources) {

  if (!_.isArray(resources) ||
    _.isEmpty(resources)
  ) {
    throw new RouterException('Invalid join(s) definition provided');
  }

  var resource = '';
  for (var index in resources) {
    resource = resources[index];

    if (!_.isString(resource)) {
      throw new RouterException('Invalid join resource provided');
    }
  }

  this.query.joins = resources;

  return this;
};

/**
 * Method returns resources to be joined
 * Expected structure:
 * [
 *   user
 * ]
 * @return array resources List of resources
 */
QueryBuilder.prototype.getJoins = function (resources) {

  if (_.has(this.query, 'joins')) {
    return this.query.joins;
  }

  return [];
};

/**
 * Method inflates an queryBuilder object based on data
 * @param  object data Assoc array of conditions, fields, groups etc.
 * @return QueryBuilder this Fluent interface
 */
QueryBuilder.prototype.inflate = function (data) {

  if (_.has(data, 'conditions')) {
    this.setConditions(data.conditions);
  }

  if (_.has(data, 'limit')) {
    this.setLimit(data.limit);
  }

  if (_.has(data, 'order')) {
    this.setOrder(data.order);
  }

  if (_.has(data, 'joins')) {
    this.setJoins(data.joins);
  }

  if (_.has(data, 'fields')) {
    this.setFields(data.fields);
  }

  return this;
};

/**
 * Method sets conditions part of query
 *
 * @param object data Conditions details field => value|condition
 * @return QueryBuilder this Fluent interface
 */
QueryBuilder.prototype.setConditions = function (data) {

  this.validateCondtionsLevel(data, 1);

  // if nothing above thrown an exception we can safely assign the conditions
  this.query.conditions = data;

  return this;
};

QueryBuilder.prototype.validateCondtionsLevel = function (data, level) {

  if (!_.isObject(data) || _.size(data) === 0 || _.isArray(data)) {
    throw new RouterException('Invalid data structure provided');
  }

  var value, tempIndex;

  for (var index in data) {

    value = data[index];

    // if it's logic it should point to array with more than 1 element
    if (index === 'and' || index === 'or') {

      if (!_.isArray(value)) {
        throw new RouterException('Logic operator expects array of conditions');
      }

      if (value.length < 2) {
        throw new RouterException('Logic operator expects array of at least two conditions');
      }

      var singleCondtion = null;
      for (tempIndex in value) {
        singleCondtion = value[tempIndex];
        level += 1;
        this.validateCondtionsLevel(singleCondtion, level);
      }

    } else {

      var tempValue;

      // now we have something like that
      // {
      //   field: 'value',
      // }
      // or
      // {
      //   field2: {
      //     'gt' : 'value2'
      //   }
      // }
      // or
      // {
      //   field3: ['abc', 'def']
      // }
      // or mix of 2 above
      // index is a field
      var field = index;

      this.fields = _.union(this.fields, [field]);

      // if type 1 it's ok!
      if (_.isString(value) || _.isNumber(value)) {
        continue;
      }

      // if it's type 2 validate that contains only strings etc
      if (_.isArray(value)) {
        for (tempIndex in value) {
          tempValue = value[tempIndex];
          if (!_.isString(tempValue) && !_.isNumber(tempValue)) {
            throw new RouterException('Invalid list of values for field: ' + field);
          }
        }
        continue;
      }

      if (_.isObject(value)) {
        for (tempIndex in value) {
          tempValue = value[tempIndex];

          if (_.isArray(tempValue)) {
            var i = null;
            for (var v in tempValue) {
              i = tempValue[v];
              // each value can be only string or integer
              if (!_.isString(i) && !_.isNumber(i)) {
                throw new RouterException('Invalid list of values for field: ' + field + ' and operator ' + tempIndex);
              }
            }
            continue;
          }

          // each index should be valid operator
          if (!_.contains(this.supportedComparisionOperators, tempIndex)) {
            throw new RouterException('Invalid operator provided for field: ' + field);
          }

          // each value can be only string or integer
          if (!_.isString(tempValue) && !_.isNumber(tempValue)) {
            throw new RouterException('Invalid list of values for field: ' + field + ' and operator ' + tempIndex);
          }
        }
      } else {
        throw new RouterException('Invalid data structure provided');
      }
    }
  }
};

/**
 * Method returns array representation of query
 * @return object query Object describing query
 */
QueryBuilder.prototype.toArray = function () {
  return this.query;
};

/**
 * Method clears current state of queryBuilder
 * @return QueryBuilder this Fluent interface
 */
QueryBuilder.prototype.reset = function () {
  this.query = {
    fields: [],
    conditions: {}
  };

  this.fields = [];

  return this;
};

module.exports = QueryBuilder;
