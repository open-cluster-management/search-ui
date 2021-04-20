// Copyright (c) 2021 Red Hat, Inc.
// Copyright Contributors to the Open Cluster Management project
import { config } from 'dotenv'
config()

import { logger, stopLogger } from './lib/logger'

if (!process.env.API_SERVER_URL) {
    throw new Error('API_SERVER_URL required')
}
logger.debug({ msg: 'environment', API_SERVER_URL: process.env.API_SERVER_URL })

if (!process.env.OAUTH2_REDIRECT_URL) {
    throw new Error('OAUTH2_REDIRECT_URL required')
}
logger.debug({ msg: 'environment', OAUTH2_REDIRECT_URL: process.env.OAUTH2_REDIRECT_URL })

if (!process.env.FRONTEND_URL) {
    throw new Error('FRONTEND_URL required')
}
logger.debug({ msg: 'environment', FRONTEND_URL: process.env.FRONTEND_URL })

import { cpus, totalmem } from 'os'

logger.debug({
    msg: `process start`,
    NODE_ENV: `${process.env.NODE_ENV}`,
    cpus: `${Object.keys(cpus()).length}`,
    memory: `${(totalmem() / (1024 * 1024 * 1024)).toPrecision(2).toString()}GB`,
    nodeVersion: `${process.versions.node}`,
})

process.on('exit', function processExit(code) {
    if (code !== 0) {
        logger.error({ msg: `process exit`, code: code })
    } else {
        logger.debug({ msg: `process exit` })
    }
    stopLogger()
})

process.on('uncaughtException', (error) => {
    logger.error({ msg: error.message, name: error.name })
    // eslint-disable-next-line no-process-exit
    process.exit(1)
})

import { startServer } from './server'
void startServer()
