'use strict';

var hookPlugin = require('mongoose-hook');
var thisPlugin = {};

// default generator
thisPlugin.generator = function(mongoose) {
  return new Buffer(new mongoose.Types.ObjectId().toString(), 'hex')
    .toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
};

// pre-hook
thisPlugin.pre = function(p, callback) {
  switch (p.method) {
    case 'insert':
      if (!p.insert._id) {
        if (this.generator) {
          p.insert._id = this.generator();
          return callback();
        }
        else if (this.generatorAsync) {
          this.generatorAsync(function(generated) {
            p.insert._id = generated;
            return callback();
          });
        }
        else {
          p.insert._id = thisPlugin.generator(this.mongoose);
          return callback();
        }
      }
      else return callback();

    default:
      return callback();
  }

  callback();
};

// Mongoose plugin

// opts = {
//   mongoose: Mongoose,
//   generator: function(): String // optional 
// }
module.exports = function(schema, opts) {
  var schemaPaths = {};

  var hookOpts = {
    name: 'mongoose-hook-custom-id',
    mongoose: opts.mongoose,
    pre: thisPlugin.pre,
    generator: opts.generator,
    generatorAsync: opts.generatorAsync
  };

  // add revision path to schema
  schemaPaths._id = String;
  schema.add(schemaPaths);

  // enable initial revisioning on model level
  schema.pre('save', function(next) {
    var _this = this;
    if (_this.isNew && !_this._id) {
      if (hookOpts.generator) {
        _this._id = hookOpts.generator();
        next();
      }
      else if (hookOpts.generatorAsync) {
        hookOpts.generatorAsync(function(generated) {
          _this._id = generated;
          next();
        });
      }
      else {
        _this._id = thisPlugin.generator(hookOpts.mongoose);
        next();
      }
    } else next();
  });

  // register mongoose-hook'ing plugin
  schema.plugin(hookPlugin, hookOpts);
};