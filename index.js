'use strict'

const btoa = require('btoa')
const http = require('http')
const md5 = require('md5')

const hostname = '192.168.0.1'
const [username, password] = process.argv.slice(2)

// [DEP0018]
process.on('unhandledRejection', error => {
    throw error
})

const cookie = (() => {
    const passwordHash = md5(password)
    const authorization = `Basic ${btoa(`${username}:${passwordHash}`)}`
    const cookie = `Authorization=${escape(authorization)};path=/`
    return cookie
})()

const getRebootPath = () => new Promise((resolve, reject) => {
    http.get({
        hostname,
        path: '/userRpm/LoginRpm.htm?Save=Save',
        headers: {
            'Cookie': cookie
        },
    }, response => {
        const {statusCode} = response
        if (statusCode !== 200) {
            reject(new Error(`Invalid status code: ${statusCode}`))
            return
        }
        let data = ''
        response.on('data', chunk => {
            data += chunk
        })
        response.on('end', () => {
            if (data.length !== 147) {
                reject(new Error('Incorrect credentials'))
                return
            }
            resolve(data.slice(85, -36) + 'SysRebootRpm.htm')
        })
    })
})

const reboot = () => getRebootPath().then(rebootPath => new Promise((resolve, reject) => {
    http.get({
        hostname,
        path: rebootPath + '?Reboot=Reboot',
        headers: {
            'Cookie': cookie,
            'Referer': `http://${hostname}/${rebootPath}`,
        },
    }, response => {
        const {statusCode} = response
        if (statusCode !== 200) {
            reject(new Error(`Invalid status code: ${statusCode}`))
            return
        }
        let data = ''
        response.on('data', chunk => {
            data += chunk
        })
        response.on('end', () => {
            if (data.length !== 4329) {
                reject(new Error('Authentication error'))
                return
            }
            resolve()
        })
    })
}))

reboot()