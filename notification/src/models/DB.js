const Sequelize = require('sequelize');
const Op = Sequelize.Op;
let { conf } = global;
process.setMaxListeners(0);
const connection = new Sequelize(conf.db.database, conf.db.username, conf.db.password, {
  host: conf.db.host,
  dialect: conf.db.dialect,
  port: conf.db.port,
  pool: {
    max: 5,
    min: 0,
    idle: 10000,
  },
  logging: conf.db.logging == false ? false : console.log,
  ...(typeof conf.db.ssl !== 'undefined' && { ssl: conf.db.ssl }),
  ...(typeof conf.db.dialectOptions !== 'undefined' && { dialectOptions: conf.db.dialectOptions }),
  operatorsAliases: {
    $eq: Op.eq,
    $ne: Op.ne,
    $gte: Op.gte,
    $gt: Op.gt,
    $lte: Op.lte,
    $lt: Op.lt,
    $not: Op.not,
    $in: Op.in,
    $notIn: Op.notIn,
    $is: Op.is,
    $like: Op.like,
    $notLike: Op.notLike,
    $iLike: Op.iLike,
    $notILike: Op.notILike,
    $regexp: Op.regexp,
    $notRegexp: Op.notRegexp,
    $iRegexp: Op.iRegexp,
    $notIRegexp: Op.notIRegexp,
    $between: Op.between,
    $notBetween: Op.notBetween,
    $overlap: Op.overlap,
    $contains: Op.contains,
    $contained: Op.contained,
    $adjacent: Op.adjacent,
    $strictLeft: Op.strictLeft,
    $strictRight: Op.strictRight,
    $noExtendRight: Op.noExtendRight,
    $noExtendLeft: Op.noExtendLeft,
    $and: Op.and,
    $or: Op.or,
    $any: Op.any,
    $all: Op.all,
    $values: Op.values,
    $col: Op.col,
  },
});
const AbstractDB = class {
  constructor() {
    this.sequelize = connection;
    this.DataTypes = Sequelize.DataTypes;
  }
};

module.exports = AbstractDB;
