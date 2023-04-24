//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'

// Parse the given input as a Swarm configuration file, returning a nested map
// of maps containing all of the parsed settings and their values.
//
// Note that this is not capable of parsing every PHP script, only that which is
// typically seen in a Swarm configuration file. This parser will recognize the
// 'return' and 'array' keywords, integers, booleans, null, simple expressions,
// and strings. Arrays may be delineated with array() or [].
function parse(input) {
  const chan = tokenGenerator(input)
  return parseStart(chan)
}

// Would have used concurrency and a channel to have a clean solution but this
// is JavaScript, so read everything into memory and create a generator of the
// full list of tokens as a compromise.
function* tokenGenerator(input) {
  const trimmed = input.trim()
  if (!trimmed.startsWith('<?php')) {
    throw new Error("input missing initial '<?php'")
  }
  const tokens = []
  lex(trimmed.substring(5), (token) => {
    tokens.push(token)
  })
  for (const token of tokens) {
    yield token
  }
}

function parseStart(chan) {
  // Swarm configuration files typically start with a return followed by a
  // value. While there could be literally any PHP code therein, we are not
  // going to support that at all.
  const token = chan.next().value
  if (token.kind === TokenType.Symbol && token.value === 'return') {
    return parseExpr(chan, 0).value
  } else {
    // after the php pragma and optional comments, the next thing should be the
    // 'return' literal
    throw new Error(`expected 'return' keyword, got ${token}`)
  }
}

// expressions may consist of multiple values separated by operators
function parseExpr(chan, level) {
  const values = []
  let terminator = null
  while (chan !== null) {
    const token = chan.next().value
    if (token === undefined) {
      break
    }
    if (token.isTerminator()) {
      terminator = token
      break
    } else if (token.kind === TokenType.Operator) {
      values.push(token.value)
    } else {
      values.push(parseValue(token, chan, level))
    }
  }
  if (values.length > 1) {
    // expressions are simply mashed together as we have no use for them
    return { value: values.join(' '), token: terminator }
  } else {
    return { value: values[0], token: terminator }
  }
}

// values are either arrays or literals
function parseValue(token, chan, level) {
  if (token.kind === TokenType.OpenBracket) {
    return parseArray(chan, level + 1)
  } else if (token.kind === TokenType.String) {
    return stripQuotes(token.value)
  } else if (token.kind === TokenType.Boolean) {
    // boolean values are only ever 'true' or 'false'
    return token.value === 'true' ? true : false
  } else if (token.kind === TokenType.Number) {
    return parseInt(token.value)
  } else if (token.kind === TokenType.Null) {
    return null
  } else if (token.kind === TokenType.Symbol && token.value === 'array') {
    let token = chan.next().value
    if (token.kind !== TokenType.OpenParen) {
      throw new Error(`expected (, got ${token}`)
    }
    return parseArray(chan, level + 1)
  }
  throw new Error(`expected value, got ${token}`)
}

// Arrays without indices will have their values mapped to monotonically
// increasing integers expressed as strings. All other index values are
// converted to strings.
function parseArray(chan, level) {
  if (level >= 128) {
    throw new Error('too many nested arrays')
  }
  const results = new Map()
  let index = 0
  while (results !== null) {
    const { value: value1, token: token1 } = parseExpr(chan, level)
    if (token1.kind === TokenType.Arrow) {
      // the LHS is the array index while the RHS is the value
      const { value: value2, token: token2 } = parseExpr(chan, level)
      if (value2 === undefined) {
        throw new Error(`expected value, got ${token2}`)
      }
      const keyStr = stripQuotes(value1.toString())
      results.set(keyStr, value2)
      if (token2.kind === TokenType.Comma) {
        // If there are more values to be found, and the most recent index
        // parses as an integer, then use that numeric value to determine the
        // next index to be used for a value that lacks an index.
        const keyNum = parseInt(keyStr)
        if (Number.isInteger(keyNum)) {
          index = keyNum + 1
        }
        continue
      } else if (token2.isArrayClose()) {
        break
      } else {
        throw new Error(`expected array close, got ${token2}`)
      }
    } else {
      // no index, just a value
      if (value1 !== undefined) {
        results.set(index.toString(), value1)
        index++
      }
      if (token1.kind === TokenType.Comma) {
        continue
      } else if (token1.isArrayClose()) {
        break
      } else {
        throw new Error(`expected array close, got ${token1}`)
      }
    }
  }
  return results
}

function stripQuotes(str) {
  if (str[0] === '"') {
    return str.replace(/^"([^]*)"$/, '$1')
  } else if (str[0] === "'") {
    return str.replace(/^'([^]*)'$/, '$1')
  }
  return str
}

// enum-like types: https://www.sohamkamani.com/javascript/enums/

class TokenType {
  static Error = new TokenType('error')
  static Symbol = new TokenType('symbol')
  static String = new TokenType('string')
  static OpenParen = new TokenType('openparen')
  static CloseParen = new TokenType('closeparen')
  static OpenBracket = new TokenType('openbracket')
  static CloseBracket = new TokenType('closebracket')
  static Comma = new TokenType('comma')
  static Operator = new TokenType('oper')
  static SemiColon = new TokenType('semi')
  static Arrow = new TokenType('arrow')
  static Boolean = new TokenType('boolean')
  static Number = new TokenType('number')
  static Null = new TokenType('null')
  static EndOfFile = new TokenType('eof')

  constructor(name) {
    this.name = name
    Object.freeze(this)
  }

  toString() {
    return `TokenType.${this.name}`;
  }
}

class Token {
  constructor(kind, value) {
    assert.ok(kind instanceof TokenType, 'token: kind must be a TokenType')
    assert.ok(typeof value === 'string' || value instanceof String, 'token: value must be a String')
    this.kind = kind
    this.value = value
    Object.freeze(this)
  }

  // return true if the token is the kind that terminates an expression
  isTerminator() {
    return this.kind === TokenType.Comma ||
      this.kind === TokenType.Arrow ||
      this.kind === TokenType.CloseParen ||
      this.kind === TokenType.CloseBracket ||
      this.kind === TokenType.SemiColon ||
      this.kind === TokenType.EndOfFile
  }

  isArrayClose() {
    return this.kind === TokenType.CloseParen || this.kind === TokenType.CloseBracket
  }

  toString() {
    return `Token[${this.kind.name}, ${this.value}]`;
  }
}

class Lexer {
  constructor(input, callback) {
    this.input = input
    this.callback = callback
    this.start = 0
    this.pos = 0
  }

  next() {
    if (this.pos >= this.input.length) {
      return null
    }
    const ch = this.input[this.pos]
    this.pos += 1
    return ch
  }

  peek() {
    if (this.pos >= this.input.length) {
      return null
    }
    return this.input[this.pos]
  }

  acceptRun(valid) {
    while (valid.indexOf(this.peek()) > -1) {
      this.next()
    }
  }

  tokenMatches(query) {
    const text = this.input.substring(this.start, this.pos)
    return text === query
  }

  ignore() {
    this.start = this.pos
  }

  rewind() {
    this.pos = this.start
  }

  error(message) {
    const token = new Token(TokenType.Error, message)
    this.callback(token)
  }

  // emit the current text as the given token type
  emit(kind) {
    const text = this.input.substring(this.start, this.pos)
    const token = new Token(kind, text)
    this.callback(token)
    this.start = this.pos
  }
}

// callback will be invoked with each new token
function lex(input, callback) {
  // Simple finite state machine using function pointers; as a result, using a
  // generator here is impossible, while a channel would have been perfect.
  const lexer = new Lexer(input, callback)
  let state = lexStart
  while (state !== null) {
    state = state(lexer)
  }
}

function lexStart(lexer) {
  const ch = lexer.next()
  if (ch === null) {
    lexer.emit(TokenType.EndOfFile)
    return null
  } else if (ch === '(') {
    lexer.emit(TokenType.OpenParen)
    return lexStart
  } else if (ch === ')') {
    lexer.emit(TokenType.CloseParen)
    return lexStart
  } else if (ch === '[') {
    lexer.emit(TokenType.OpenBracket)
    return lexStart
  } else if (ch === ']') {
    lexer.emit(TokenType.CloseBracket)
    return lexStart
  } else if (ch === ',') {
    lexer.emit(TokenType.Comma)
    return lexStart
  } else if (ch === ';') {
    lexer.emit(TokenType.SemiColon)
    return lexStart
  } else if (ch === '=') {
    return lexArrow
  } else if (' \t\n\r'.indexOf(ch) > -1) {
    return lexSeparator
  } else if (ch === '"') {
    return lexString('"')
  } else if (ch === "'") {
    return lexString("'")
  } else if (isNumeric(ch)) {
    return lexNumber
  } else if (ch === 't' || ch === 'f') {
    return lexBoolean
  } else if (ch === 'n') {
    return lexNull
  } else if (isAlphabetic(ch)) {
    return lexSymbol
  } else if (ch === '#') {
    return lexCommentLine
  } else if (ch === '/') {
    return lexComment
  } else if ('.+-*/%'.indexOf(ch) > -1) {
    // handle / before operators in case of // or /* comments
    return lexOperator
  } else {
    lexer.error(`unexpected character <<${ch}>>`)
    return null
  }
}

function lexArrow(lexer) {
  const ch = lexer.next()
  if (ch === '>') {
    lexer.emit(TokenType.Arrow)
    return lexStart
  } else {
    lexer.error('expected > after =')
    return null
  }
}

function lexString(eos) {
  // simple function currying to allow for different quotes
  return (lexer) => {
    let reachedEnd = false
    while (!reachedEnd) {
      const ch = lexer.next()
      if (ch === null) {
        lexer.error('reached EOF in a string')
        return null
      } else if (ch === '\\') {
        lexer.next()
      } else if (ch === eos) {
        lexer.emit(TokenType.String)
        reachedEnd = true
      }
    }
    return lexStart
  }
}

function lexNumber(lexer) {
  let ch = lexer.peek()
  while (ch !== null && isNumeric(ch)) {
    lexer.next()
    ch = lexer.peek()
  }
  lexer.emit(TokenType.Number)
  return lexStart
}

function lexBoolean(lexer) {
  lexer.acceptRun('aelrsu')
  if (lexer.tokenMatches('true') || lexer.tokenMatches('false')) {
    lexer.emit(TokenType.Boolean)
    return lexStart
  }
  lexer.rewind()
  return lexSymbol
}

function lexNull(lexer) {
  lexer.acceptRun('ul')
  if (lexer.tokenMatches('null')) {
    lexer.emit(TokenType.Null)
    return lexStart
  }
  lexer.rewind()
  return lexSymbol
}

function lexSymbol(lexer) {
  lexer.acceptRun('abcdefghijklmnopqrstuvwxyz')
  lexer.emit(TokenType.Symbol)
  return lexStart
}

function lexSeparator(lexer) {
  lexer.acceptRun(' \t\n\r')
  lexer.ignore()
  return lexStart
}

function lexOperator(lexer) {
  // not all operators can be repeated or combined in PHP, but for this simple
  // lexer, just accept anything contiquous as being a single operator
  lexer.acceptRun('.+-*/%')
  lexer.emit(TokenType.Operator)
  return lexStart
}

function lexComment(lexer) {
  const ch = lexer.next()
  if (ch === '/') {
    return lexCommentLine
  } else if (ch === '*') {
    return lexCommentBlock
  } else {
    return lexOperator
  }
}

function lexCommentLine(lexer) {
  let ch = lexer.peek()
  while (ch !== null && '\n\r'.indexOf(ch) === -1) {
    lexer.next()
    ch = lexer.peek()
  }
  lexer.ignore()
  return lexStart
}

function lexCommentBlock(lexer) {
  let ch = lexer.next()
  while (ch !== null) {
    // note that PHP does not support nested block comments
    if (ch === '*') {
      if (lexer.next() === '/') {
        break
      }
    }
    ch = lexer.next()
  }
  lexer.ignore()
  return lexStart
}

function isNumeric(ch) {
  return !isNaN(parseInt(ch, 10))
}

function isAlphabetic(ch) {
  if (ch !== null) {
    let n = ch.charCodeAt(0)
    return (n >= 65 && n < 91) || (n >= 97 && n < 123)
  }
  return false
}

export { TokenType, Token, lex, parse }
