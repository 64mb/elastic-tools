/* eslint-disable no-console */
require('dotenv').config()

const logger = null

// DEBUG LOG
if (logger) {
  logger.log = (msg) => {
    logger.debug(msg)
  }
}

module.exports = {
  info(_msg, ..._args) {
    if (logger) {
      if (_args.length > 0) logger.info(_msg, ..._args)
      else logger.info(_msg)
    } else {
      // eslint-disable-next-line no-console
      console.info(_msg, ..._args)
    }
  },
  warn(_msg, ..._args) {
    if (logger) {
      if (_args.length > 0) logger.warn(_msg, ..._args)
      else logger.warn(_msg)
    } else {
      // eslint-disable-next-line no-console
      console.warn(_msg, ..._args)
    }
  },
  error(_msg, ..._args) {
    if (logger) {
      if (_args.length > 0) logger.error(_msg, ..._args)
      else logger.error(_msg)
    } else {
      // eslint-disable-next-line no-console
      console.error(_msg, ..._args)
    }
  },
  fatal(_msg, ..._args) {
    if (logger) {
      if (_args.length > 0) logger.fatal(_msg, ..._args)
      else logger.fatal(_msg)
    } else {
      // eslint-disable-next-line no-console
      console.error(_msg, ..._args)
    }
  },
  debug(_msg, ..._args) {
    if (logger) {
      if (_args.length > 0) logger.debug(_msg, ..._args)
      else logger.debug(_msg)
    } else {
      // eslint-disable-next-line no-console
      console.debug(_msg, ..._args)
    }
  },
  log(_msg, ..._args) {
    if (logger && logger.log) {
      if (_args.length > 0) logger.log(_msg, ..._args)
      else logger.log(_msg)
    } else {
      // eslint-disable-next-line no-console
      console.debug(_msg, ..._args)
    }
  },
}
