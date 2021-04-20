// Copyright (c) 2021 Red Hat, Inc.
// Copyright Contributors to the Open Cluster Management project

/* eslint-disable @typescript-eslint/no-explicit-any */
import Axios, { AxiosResponse } from 'axios'
import { fastify as Fastify, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fastifyCookie from 'fastify-cookie'
import fastifyCors from 'fastify-cors'
import fastifyCsrf from 'fastify-csrf'
import { fastifyOauth2, OAuth2Namespace } from 'fastify-oauth2'
import fastifyReplyFrom from 'fastify-reply-from'
import fastifyStatic from 'fastify-static'
import { readFile } from 'fs'
import { STATUS_CODES } from 'http'
import * as https from 'https'
import { extname, join } from 'path'
import { URL } from 'url'
import { promisify } from 'util'
import { logError, logger } from './lib/logger'
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-var-requires
const fastifyHttpProxy = require('fastify-http-proxy') // import isn't working for this lib.

const ACM_ACCESS_TOKEN_COOKIE = 'acm-access-token-cookie'

declare module 'fastify-reply-from' {
    export interface From {
        from: (path: string) => void
    }
}

function handleFileReadError(e: Error): void {
    logError('Error reading file.', e)
}

function getUrlPath(url: string): string {
    return url.includes('?') ? url.substr(0, url.indexOf('?')) : url
}

export async function startServer(): Promise<FastifyInstance> {
    const keyPromise = promisify<string, Buffer>(readFile)('./certs/tls.key').catch(handleFileReadError)
    const certPromise = promisify<string, Buffer | undefined>(readFile)('./certs/tls.crt').catch(handleFileReadError)
    const indexHtmlPromise = promisify<string, Buffer | undefined>(readFile)(
        join(__dirname, 'public', 'index.html')
    ).catch(handleFileReadError)
    const key = await keyPromise
    const cert = await certPromise
    const indexHtml: string = ((await indexHtmlPromise) || '').toString('utf-8')

    let fastify: FastifyInstance
    if (key && cert) {
        fastify = Fastify({ https: { key, cert }, logger: false })
    } else {
        fastify = Fastify({ logger: false })
    }

    if (process.env.NODE_ENV !== 'production') {
        await fastify.register(fastifyCors, {
            origin: true,
            methods: ['GET', 'PUT', 'POST', 'PATCH', 'DELETE'],
            credentials: true,
        })
    }

    await fastify.register(fastifyCookie)
    await fastify.register(fastifyCsrf)

    const serveIndexHtml = async (request: FastifyRequest, reply: FastifyReply) => {
        const token = await reply.generateCsrf()
        await reply
            .code(200)
            .type('text/html')
            .send(indexHtml.replace(RegExp('{{ CSRF_TOKEN }}', 'g'), token))
    }

    fastify.get('/search/index.html', serveIndexHtml)
    fastify.get('/search', serveIndexHtml)
    fastify.get('/overview', serveIndexHtml)
    fastify.get('/resources', serveIndexHtml)

    fastify.get('/ping', async (req, res) => {
        await res.code(200).send()
    })

    fastify.get('/livenessProbe', async (req, res) => {
        await res.code(200).send()
    })

    fastify.get('/readinessProbe', async (req, res) => {
        await res.code(200).send()
    })

    fastify.get('/search/tokenValidation', async (req: FastifyRequest, res: FastifyReply) => {
        const token = req.cookies['acm-access-token-cookie']
        if (!token) {
            return res.code(401).send()
        }
        return res.code(200).send()
    })

    function csrfProtection(req: FastifyRequest, res: FastifyReply, done: () => void) {
        process.env.NODE_ENV !== 'production' ? done() : fastify.csrfProtection(req, res, done)
    }

    // Proxy to SEARCH-API
    await fastify.register(fastifyHttpProxy, {
        upstream: process.env.SEARCH_API_URL || 'https://search-search-api:4010',
        prefix: '/searchapi/graphql',
        rewritePrefix: '/searchapi/graphql',
        http2: false,
        preHandler: csrfProtection,
    })

    // Proxy to CONSOLE-API
    await fastify.register(fastifyHttpProxy, {
        upstream: process.env.CONSOLE_API_URL || 'https://console-api:4000',
        prefix: '/search/console-api/graphql',
        rewritePrefix: '/hcmuiapi/graphql',
        http2: false,
        preHandler: csrfProtection,
    })
    // Proxy to CONSOLE-API (from /resources)
    await fastify.register(fastifyHttpProxy, {
        upstream: process.env.CONSOLE_API_URL || 'https://console-api:4000',
        prefix: '/resources/search/console-api/graphql',
        rewritePrefix: '/hcmuiapi/graphql',
        http2: false,
        preHandler: csrfProtection,
    })

    // CONSOLE-HEADER
    /* istanbul ignore next */
    if (process.env.NODE_ENV === 'development') {
        const acmUrl = process.env.API_SERVER_URL.replace('api', 'multicloud-console.apps').replace(':6443', '')
        await fastify.register(fastifyReplyFrom, {
            base: acmUrl,
        })

        fastify.all('/multicloud/header/*', (req, res) => {
            req.headers.authorization = `Bearer ${req.cookies[ACM_ACCESS_TOKEN_COOKIE]}`
            res.from(req.raw.url)
        })

        fastify.all('/search/header', async (req, res) => {
            let headerResponse: AxiosResponse
            logger.debug({ msg: 'search/header call', cookies: req.cookies })
            try {
                const isDevelopment = process.env.NODE_ENV === 'development' ? 'true' : 'false'
                headerResponse = await Axios.request({
                    url: `${acmUrl}/multicloud/header/api/v1/header?serviceId=mcm-ui&dev=${isDevelopment}`,
                    method: 'GET',
                    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                    headers: {
                        Authorization: `Bearer ${req.cookies[ACM_ACCESS_TOKEN_COOKIE]}`,
                    },
                    responseType: 'json',
                    validateStatus: () => true,
                })
            } catch (err) {
                return res.code(500).send(err)
            }
            return res.code(headerResponse.status).send(headerResponse?.data)
        })
    }

    fastify.addHook('onRequest', (request, reply, done) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ;(request as any).start = process.hrtime()
        done()
    })

    fastify.addHook('onResponse', (request, reply, done) => {
        switch (request.url) {
            case '/ping':
                break
            case '/livenessProbe':
                break
            case '/readinessProbe':
                break
            default:
                {
                    const url = getUrlPath(request.url)
                    let msg: { [key: string]: any }

                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    const operationName = (request.body as any)?.operationName as string
                    if (operationName) {
                        msg = { msg: STATUS_CODES[reply.statusCode] }
                        msg.operation = operationName
                    } else {
                        msg = {
                            msg: STATUS_CODES[reply.statusCode],
                            status: reply.statusCode,
                            method: request.method,
                            url,
                        }
                    }

                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
                    const start = (request as any).start
                    const diff = process.hrtime(start)
                    const time = Math.round((diff[0] * 1e9 + diff[1]) / 10000) / 100
                    msg.ms = time

                    if (reply.statusCode < 400) {
                        logger.info(msg)
                    } else if (reply.statusCode < 500) {
                        logger.warn(msg)
                    } else {
                        logger.error(msg)
                    }
                }
                break
        }
        done()
    })

    // VALIDATE AUTH
    if (!process.env.GENERATE) {
        // GET .well-known/oauth-authorization-server from the CLUSTER API for oauth
        const response = await Axios.get<{ authorization_endpoint: string; token_endpoint: string }>(
            `${process.env.API_SERVER_URL}/.well-known/oauth-authorization-server`,
            {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                headers: { Accept: 'application/json' },
                responseType: 'json',
            }
        )

        const authorizeUrl = new URL(response.data.authorization_endpoint)
        const tokenUrl = new URL(response.data.token_endpoint)
        const validStates = new Set()
        await fastify.register(fastifyOauth2, {
            name: 'openshift',
            scope: ['user:full'],
            credentials: {
                client: {
                    id: process.env.OAUTH2_CLIENT_ID,
                    secret: process.env.OAUTH2_CLIENT_SECRET,
                },
                auth: {
                    authorizeHost: `${authorizeUrl.protocol}//${authorizeUrl.hostname}`,
                    authorizePath: authorizeUrl.pathname,
                    tokenHost: `${tokenUrl.protocol}//${tokenUrl.hostname}`,
                    tokenPath: tokenUrl.pathname,
                },
            },
            // register a url to start the redirect flow
            startRedirectPath: '/search/login',
            // oauth redirect here after the user login
            callbackUri: process.env.OAUTH2_REDIRECT_URL,
            generateStateFunction: (request: FastifyRequest) => {
                const query = request.query as { code: string; state: string }
                const state = query.state
                validStates.add(state)
                return state
            },
            checkStateFunction: (returnedState: string, callback: (error?: Error) => void) => {
                if (validStates.has(returnedState)) {
                    validStates.delete(returnedState)
                    callback()
                    return
                }
                callback(new Error('Invalid state'))
            },
        })

        fastify.get('/search/login/callback', async function (request, reply) {
            const query = request.query as { code: string; state: string }
            validStates.add(query.state)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const openshift = ((this as unknown) as any).openshift as OAuth2Namespace
            const token = await openshift.getAccessTokenFromAuthorizationCodeFlow(request)
            logger.debug({ msg: 'search/login/callback token', token: token.access_token })
            return reply
                .setCookie(ACM_ACCESS_TOKEN_COOKIE, `${token.access_token}`, {
                    path: '/',
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: token.expires_in,
                })
                .redirect(`${process.env.FRONTEND_URL}`)
        })

        fastify.delete('/search/login', async function (request, reply) {
            const token = request.cookies[ACM_ACCESS_TOKEN_COOKIE]
            if (token) {
                await Axios.delete(
                    `${process.env.API_SERVER_URL}/apis/oauth.openshift.io/v1/oauthaccesstokens/${token}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                )
                void reply.code(200).send()
            }
        })
    }

    fastify.setNotFoundHandler((request, response) => {
        if (!extname(getUrlPath(request.url))) {
            void response.code(200).sendFile('index.html', join(__dirname, 'public'))
        } else {
            void response.code(404).send()
        }
    })
    await fastify.register(fastifyStatic, {
        root: join(__dirname, 'public'),
        prefix: '/search/', // optional: default '/'
        immutable: true,
        maxAge: 60 * 60 * 1000,
    })

    fastify.addHook('onClose', (instance, done: () => void) => {
        logger.debug('server closed')
        setTimeout(function () {
            logger.error('shutdown timeout')
            // eslint-disable-next-line no-process-exit
            process.exit(1)
        }, 60 * 1000).unref()
        done()
    })

    await new Promise<void>((resolve, reject) => {
        fastify.listen(
            process.env.PORT ? Number(process.env.PORT) : undefined,
            '::', // Defaults to IPv6 and falls back to IPv4
            (err: Error, address: string) => {
                if (process.env.GENERATE) {
                    void fastify.close()
                }
                if (err) {
                    logger.error(err)
                    process.exit(1) // eslint-disable-line no-process-exit
                } else {
                    logger.info({ msg: 'server started', address })
                    resolve()
                }
            }
        )
    })

    process.on('SIGTERM', () => {
        logger.debug({ msg: 'process SIGTERM' })
        logger.debug({ msg: 'closing server' })
        void fastify.close()
        if (process.env.NODE_ENV !== 'test') {
            setTimeout(function () {
                logger.error({ msg: 'shutdown timeout' })
                process.exit(1) // eslint-disable-line no-process-exit
            }, 10 * 1000).unref()
        }
    })

    process.on('SIGINT', () => {
        // eslint-disable-next-line no-console
        console.log()
        logger.debug({ msg: 'process SIGINT' })
        logger.debug({ msg: 'closing server' })
        void fastify.close()
        if (process.env.NODE_ENV !== 'test') {
            setTimeout(function () {
                logger.error({ msg: 'shutdown timeout' })
                // eslint-disable-next-line no-process-exit
                process.exit(1)
            }, 10 * 1000).unref()
        }
    })

    process.on('uncaughtException', (err) => {
        logger.error({ msg: `process uncaughtException`, error: err.message })
        logger.debug({ msg: 'closing server' })
        void fastify.close()
    })

    process.on('multipleResolves', (type, promise, reason) => {
        logger.error({ msg: 'process multipleResolves', type })
        void fastify.close()
    })

    process.on('unhandledRejection', (reason, promise) => {
        logger.error({ msg: 'process unhandledRejection', reason })
        void fastify.close()
    })

    return fastify
}
