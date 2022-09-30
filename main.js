const fs = require('fs')
const es = require('./elasticsearch')
const logger = require('./logger')

async function main() {
  // let template = fs.readFileSync('./templates/template.json')
  // template = JSON.parse(template)

  // const rUpdate = await es.updateTemplate('template_v1', template)
  // logger.info(rUpdate)

  // const rReindex = await es.reindexIndex('index-01', 'index-02')
  // logger.info(rReindex)

  // await es.deleteIndex('index-01')

  // const rReindexFix = await es.reindexIndexesFix('index-01')
  // logger.info(rReindexFix)
}

main().then(() => {
  logger.info('finish elastic script')
}).catch((err) => {
  logger.error(err.stack || err)
})
