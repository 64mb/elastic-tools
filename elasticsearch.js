require('dotenv').config()
const { Client } = require('@elastic/elasticsearch')
const logger = require('./logger')

const client = new Client({
  node: process.env.ELASTIC_HOST,
  auth: {
    username: process.env.ELASTIC_USER,
    password: process.env.ELASTIC_PASSWORD,
  },
})

async function findTemplate(name) {
  const result = { data: null, error: null }

  try {
    const templates = (await client.indices.getTemplate()).body

    result.data = Object.keys(templates).filter((i) => i.indexOf(name) > -1)
  } catch (err) {
    result.error = err
    logger.error(`TEMPLATE [${name}] SEARCH ERROR`)
  }
  return result
}

async function putTemplate(name, template) {
  const result = { data: null, error: null }

  try {
    const templates = await findTemplate(name)

    if (templates.data != null && templates.data.indexOf(name) > -1) {
      result.error = new Error(`template [${name}] already existed`)
      logger.info(`TEMPLATE [${name}] ALREADY EXIST`)
      return result
    }

    const insertResult = await client.indices.putTemplate({
      name,
      body: template,
    })

    result.data = insertResult.body
    result.error = insertResult.warnings
  } catch (err) {
    result.error = err
    logger.error(`TEMPLATE [${name}] PUT ERROR`)
  }
  return result
}

async function deleteTemplate(name) {
  const result = { data: null, error: null }

  try {
    const templates = await findTemplate(name)

    let count = 0
    if (templates.data != null && templates.data.indexOf(name) > -1) {
      const deleteResults = await Promise.all(templates.data.map(
        (template) => client.indices.deleteTemplate({ name: template }),
      ))
      deleteResults.forEach((dr) => {
        count += 1
      })
    }

    result.data = { deleted: count }
  } catch (err) {
    result.error = err
    logger.error(`TEMPLATE [${name}] DELETE ERROR`)
  }
  return result
}

async function updateTemplate(name, template) {
  const result = { data: null, error: null }

  try {
    const rDelete = await deleteTemplate(name)
    if (rDelete.error != null) {
      result.error = rDelete.error
      return result
    }
    const rPut = await putTemplate(name, template)
    if (rPut.error != null) {
      result.error = rPut.error
      return result
    }

    result.data = rPut.data
  } catch (err) {
    result.error = err
    logger.error(`TEMPLATE [${name}] UPDATE ERROR`)
  }
  return result
}

async function getTemplateSettings(name) {
  const result = { data: null, error: null }

  try {
    const template = await client.indices.getTemplate({ name })
    result.data = template.body[name].settings
  } catch (err) {
    result.error = 'template not found'
    logger.error(`TEMPLATE [${name}] NOT FOUND`)
  }
  return result
}

async function getTemplatePatterns(name) {
  const result = { data: null, error: null }

  try {
    const template = await client.indices.getTemplate({ name })
    result.data = template.body[name].index_patterns
  } catch (err) {
    result.error = 'template not found'
    logger.error(`TEMPLATE [${name}] NOT FOUND`)
  }
  return result
}

async function getIndexes(name, exclude = null) {
  const result = { data: null, error: null }

  try {
    const indexes = await client.indices.get({
      index: name,
    })
    result.data = Object.keys(indexes.body).filter((i) => (exclude != null ? i.indexOf(exclude) === -1 : true))
  } catch (err) {
    result.error = 'indexes not found'
    logger.error(`INDEX [${name}] NOT FOUND`)
  }
  return result
}

async function reindexIndexesFix(indexPattern, excludes = []) {
  const result = { data: null, error: null }

  try {
    let indexes = (await getIndexes(indexPattern, 'fix')).data

    excludes.forEach((exclude) => {
      indexes = indexes.filter((i) => i.indexOf(exclude) === -1)
    })
    logger.log(`POTENTIAL REINDEX ${indexes}`)

    // ONE BY ONE NEEDED, PERFORMANCE SAFETY
    for (let i = 0; i < indexes.length; i += 1) {
      const index = indexes[i]
      await client.reindex({
        body: {
          source: {
            index,
          },
          dest: {
            index: `${index}-fix`,
          },
        },
      })
      logger.log(`INDEX [${index}] REINDEXED`)
    }
    logger.log(`REINDEX FIX PATTERN [${indexPattern}] FINISH`)
  } catch (err) {
    result.error = err
    logger.error(`REINDEX FIX BY PATTERN [${indexPattern}], EXCLUDES ${excludes} FAILED`)
  }
  return result
}

async function reindexIndex(indexPattern, indexDestination, skipConflicts = false) {
  const result = { data: null, error: null }

  try {
    const options = {
      source: {
        index: indexPattern,
      },
      dest: {
        index: indexDestination,
      },
    }
    if (skipConflicts) options.conflicts = 'proceed'

    result.data = await client.reindex({
      body: options,
    })
    logger.log(`REINDEX PATTERN [${indexPattern}] DESTINATION [${indexDestination}] FINISH`)
  } catch (err) {
    result.error = err
    logger.error(`REINDEX BY PATTERN [${indexPattern}] DESTINATION ${indexDestination} FAILED`)
  }
  return result
}

async function registerSnapshotRepository(name, location) {
  const result = { data: null, error: null }

  try {
    try {
      result.data = await client.snapshot.getRepository({
        repository: name,
      })
    } catch (err) {
      logger.log(`SNAPSHOT REGISTRY PATTERN [${name}] NOT FOUND`)
      result.data = await client.snapshot.createRepository({
        repository: name,
        body: {
          type: 'source',
          settings: {
            delegate_type: 'fs',
            location,
            compress: true,
          },
        },
      })
    }
  } catch (err) {
    result.error = err
    logger.error(`SNAPSHOT REGISTRY [${name}] CREATE FAILED`)
  }
  return result
}

async function deleteSnapshotRepository(name) {
  const result = { data: null, error: null }

  try {
    await client.snapshot.getRepository({
      repository: name,
    })
    result.data = await client.snapshot.deleteRepository({
      repository: name,
    })
  } catch (err) {
    result.error = err
    logger.error(`SNAPSHOT REGISTRY [${name}] DELETE FAILED`)
  }
  return result
}

async function createSnapshot(repository, name, indices = []) {
  const result = { data: null, error: null }

  try {
    result.data = await client.snapshot.create({
      repository,
      snapshot: name,
      wait_for_completion: true,
      body: {
        indices: indices.join(','),
        ignore_unavailable: true,
        include_global_state: false,
      },
    })
  } catch (err) {
    result.error = err
    logger.error(`SNAPSHOT [${repository}.${name}] CREATE FAILED`)
  }
  return result
}

async function deleteDocument(index, id) {
  const result = { data: null, error: null }

  try {
    result.data = await client.delete({
      index,
      id,
      type: '_doc',
    })
  } catch (err) {
    result.error = err
    logger.error(`DOCUMENT [${index}.${id}] DELETE FAILED`)
  }
  return result
}

async function deleteIndex(index) {
  const result = { data: null, error: null }

  try {
    result.data = await client.indices.delete({
      index,
    })
  } catch (err) {
    result.error = err
    logger.error(`INDEX [${index}] DELETE FAILED`)
  }
  return result
}

module.exports = {
  reindexIndex,
  reindexIndexesFix,
  getIndexes,
  getTemplatePatterns,
  findTemplate,
  putTemplate,
  deleteTemplate,
  updateTemplate,
  getTemplateSettings,
  registerSnapshotRepository,
  deleteSnapshotRepository,
  createSnapshot,
  deleteIndex,
  deleteDocument,
}
