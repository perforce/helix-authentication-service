//
// Copyright 2026 Perforce Software
//
import { EventEmitter } from 'node:events'

// from https://medium.com/@artemkhrenov/advanced-concurrency-patterns-in-javascript-semaphore-mutex-read-write-lock-deadlock-prevention-79e8bffb5b81
// with fixes for the lock acquisition logic

class ReadWriteLock {
  constructor() {
    this.mutex = new Semaphore(1)
    this.emitter = new EventEmitter()
    // set a high limit for testing purposes
    this.emitter.setMaxListeners(100)
    this.readCount = 0
    this.writeCount = 0
    this.waitingWriters = 0
  }

  async acquireReadLock() {
    await this.mutex.acquire()
    try {
      while (this.writeCount > 0 || this.waitingWriters > 0) {
        this.mutex.release()
        const readPromise = new Promise(resolve => {
          const handler = () => {
            this.emitter.removeListener('writeComplete', handler)
            resolve()
          }
          this.emitter.on('writeComplete', handler)
        })
        await readPromise
        await this.mutex.acquire()
      }
      this.readCount++
    } finally {
      this.mutex.release()
    }
  }

  async releaseReadLock() {
    await this.mutex.acquire()
    try {
      this.readCount--
      if (this.readCount === 0) {
        this.emitter.emit('readComplete')
      }
    } finally {
      this.mutex.release()
    }
  }

  async acquireWriteLock() {
    await this.mutex.acquire()
    try {
      this.waitingWriters++
      while (this.writeCount > 0 || this.readCount > 0) {
        this.mutex.release()
        const writePromise = new Promise(resolve => {
          const handler = () => {
            this.emitter.removeListener('readComplete', handler)
            this.emitter.removeListener('writeComplete', handler)
            resolve()
          }
          this.emitter.on('readComplete', handler)
          this.emitter.on('writeComplete', handler)
        })
        await writePromise
        await this.mutex.acquire()
      }
      this.waitingWriters--
      this.writeCount++
    } finally {
      this.mutex.release()
    }
  }

  async releaseWriteLock() {
    await this.mutex.acquire()
    try {
      this.writeCount--
      this.emitter.emit('writeComplete')
    } finally {
      this.mutex.release()
    }
  }
}

class Semaphore {
  constructor(maxConcurrent = 1) {
    this.maxConcurrent = maxConcurrent
    this.current = 0
    this.queue = []
  }

  async acquire() {
    if (this.current < this.maxConcurrent) {
      this.current++
      return Promise.resolve()
    }

    return new Promise(resolve => {
      this.queue.push(resolve)
    })
  }

  release() {
    this.current--
    if (this.queue.length > 0 && this.current < this.maxConcurrent) {
      this.current++
      const next = this.queue.shift()
      next()
    }
  }
}

export { ReadWriteLock }
