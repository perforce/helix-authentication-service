//
// Copyright 2023 Perforce Software
//
import * as fs from 'node:fs'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { lex, parse, Token, TokenType } from 'helix-auth-svc/lib/features/login/data/parsers/SwarmConfigParser.js'

describe('SwarmConfig parser', function () {
  describe('basic lexer', function () {
    it('should return only EOF for empty input', function () {
      let tokenCount = 0
      lex('', (token) => {
        assert.equal(token.kind, TokenType.EndOfFile)
        tokenCount += 1
      })
      assert.equal(tokenCount, 1)
    })

    it('should throw errors for malformed input', function () {
      const emittedTokens = []
      lex(' ( , =  )   ', (token) => {
        emittedTokens.push(token)
      })
      assert.deepEqual(emittedTokens, [
        new Token(TokenType.OpenParen, '('),
        new Token(TokenType.Comma, ','),
        new Token(TokenType.Error, 'expected > after ='),
      ])
    })

    it('should ignore whitespace and return basic symbols', function () {
      const emittedTokens = []
      lex(' ( , =>  )   ', (token) => {
        emittedTokens.push(token)
      })
      assert.deepEqual(emittedTokens, [
        new Token(TokenType.OpenParen, '('),
        new Token(TokenType.Comma, ','),
        new Token(TokenType.Arrow, '=>'),
        new Token(TokenType.CloseParen, ')'),
        new Token(TokenType.EndOfFile, '')
      ])
    })

    it('should fail to lex EOF in strings', function () {
      const emittedTokens = []
      lex("('foobar", (token) => {
        emittedTokens.push(token)
      })
      assert.deepEqual(emittedTokens, [
        new Token(TokenType.OpenParen, '('),
        new Token(TokenType.Error, "reached EOF in a string"),
      ])
    })

    it('should lex single-quoted strings', function () {
      const emittedTokens = []
      lex("('foobar')", (token) => {
        emittedTokens.push(token)
      })
      assert.deepEqual(emittedTokens, [
        new Token(TokenType.OpenParen, '('),
        new Token(TokenType.String, "'foobar'"),
        new Token(TokenType.CloseParen, ')'),
        new Token(TokenType.EndOfFile, '')
      ])
    })

    it('should lex double-quoted strings', function () {
      const emittedTokens = []
      lex('("foobar")', (token) => {
        emittedTokens.push(token)
      })
      assert.deepEqual(emittedTokens, [
        new Token(TokenType.OpenParen, '('),
        new Token(TokenType.String, '"foobar"'),
        new Token(TokenType.CloseParen, ')'),
        new Token(TokenType.EndOfFile, '')
      ])
    })

    it('should lex multi-line strings', function () {
      const emittedTokens = []
      lex("'foo\nbar\nbaz'", (token) => {
        emittedTokens.push(token)
      })
      assert.deepEqual(emittedTokens, [
        new Token(TokenType.String, "'foo\nbar\nbaz'"),
        new Token(TokenType.EndOfFile, '')
      ])
    })

    it('should ignore shell-style comments', function () {
      let emittedTokens = []
      lex('(\n#foobar\n)', (token) => {
        emittedTokens.push(token)
      })
      assert.deepEqual(emittedTokens, [
        new Token(TokenType.OpenParen, '('),
        new Token(TokenType.CloseParen, ')'),
        new Token(TokenType.EndOfFile, '')
      ])
      // comment ending with end of input
      emittedTokens = []
      lex('#foobar', (token) => {
        emittedTokens.push(token)
      })
      assert.deepEqual(emittedTokens, [
        new Token(TokenType.EndOfFile, '')
      ])
    })

    it('should ignore single-line C++ style comments', function () {
      const emittedTokens = []
      lex('(\n//foobar\n)', (token) => {
        emittedTokens.push(token)
      })
      assert.deepEqual(emittedTokens, [
        new Token(TokenType.OpenParen, '('),
        new Token(TokenType.CloseParen, ')'),
        new Token(TokenType.EndOfFile, '')
      ])
    })

    it('should ignore C style multi-line comments', function () {
      const emittedTokens = []
      lex('(\n/*\nfoobar\n/* foo */\n)', (token) => {
        emittedTokens.push(token)
      })
      assert.deepEqual(emittedTokens, [
        new Token(TokenType.OpenParen, '('),
        new Token(TokenType.CloseParen, ')'),
        new Token(TokenType.EndOfFile, '')
      ])
    })

    it('should lex simple integers', function () {
      const emittedTokens = []
      lex('12345', (token) => {
        emittedTokens.push(token)
      })
      assert.deepEqual(emittedTokens, [
        new Token(TokenType.Number, '12345'),
        new Token(TokenType.EndOfFile, '')
      ])
    })

    it('should lex numeric expressions', function () {
      const emittedTokens = []
      lex('123 * 456 + 890', (token) => {
        emittedTokens.push(token)
      })
      assert.deepEqual(emittedTokens, [
        new Token(TokenType.Number, '123'),
        new Token(TokenType.Operator, '*'),
        new Token(TokenType.Number, '456'),
        new Token(TokenType.Operator, '+'),
        new Token(TokenType.Number, '890'),
        new Token(TokenType.EndOfFile, '')
      ])
    })

    it('should lex boolean and null literals', function () {
      const emittedTokens = []
      lex('true false null', (token) => {
        emittedTokens.push(token)
      })
      assert.deepEqual(emittedTokens, [
        new Token(TokenType.Boolean, 'true'),
        new Token(TokenType.Boolean, 'false'),
        new Token(TokenType.Null, 'null'),
        new Token(TokenType.EndOfFile, '')
      ])
    })

    it('should lex symbols', function () {
      const emittedTokens = []
      lex('return fals array nulk foobar truu', (token) => {
        emittedTokens.push(token)
      })
      assert.deepEqual(emittedTokens, [
        new Token(TokenType.Symbol, 'return'),
        new Token(TokenType.Symbol, 'fals'),
        new Token(TokenType.Symbol, 'array'),
        new Token(TokenType.Symbol, 'nulk'),
        new Token(TokenType.Symbol, 'foobar'),
        new Token(TokenType.Symbol, 'truu'),
        new Token(TokenType.EndOfFile, '')
      ])
    })

    it('should lex a short config excerpt', function () {
      const input = `
return array(
    'environment' => array(
        'mode' => false,
        'priority' => 7,
        'level' => null,
        'value' => 'string',
    ),
`
      const emittedTokens = []
      lex(input, (token) => {
        emittedTokens.push(token)
      })
      assert.deepEqual(emittedTokens, [
        new Token(TokenType.Symbol, 'return'),
        new Token(TokenType.Symbol, 'array'),
        new Token(TokenType.OpenParen, '('),
        new Token(TokenType.String, "'environment'"),
        new Token(TokenType.Arrow, '=>'),
        new Token(TokenType.Symbol, 'array'),
        new Token(TokenType.OpenParen, '('),
        new Token(TokenType.String, "'mode'"),
        new Token(TokenType.Arrow, '=>'),
        new Token(TokenType.Boolean, 'false'),
        new Token(TokenType.Comma, ','),
        new Token(TokenType.String, "'priority'"),
        new Token(TokenType.Arrow, '=>'),
        new Token(TokenType.Number, '7'),
        new Token(TokenType.Comma, ','),
        new Token(TokenType.String, "'level'"),
        new Token(TokenType.Arrow, '=>'),
        new Token(TokenType.Null, 'null'),
        new Token(TokenType.Comma, ','),
        new Token(TokenType.String, "'value'"),
        new Token(TokenType.Arrow, '=>'),
        new Token(TokenType.String, "'string'"),
        new Token(TokenType.Comma, ','),
        new Token(TokenType.CloseParen, ')'),
        new Token(TokenType.Comma, ','),
        new Token(TokenType.EndOfFile, '')
      ])
    })
  })

  describe('basic parsing', function () {
    it('should reject input without php pragma', function () {
      assert.throws(() => parse(''), Error, "input missing initial '<?php'")
    })

    it('should unexpected EOF', function () {
      // no value results in an undefined
      const results = parse('<?php return')
      assert.isUndefined(results)
    })

    it('should return string literal', function () {
      const results = parse('<?php return "foobar"')
      assert.equal(results, 'foobar')
    })

    it('should return numeric literal', function () {
      const results = parse('<?php return 1234')
      assert.equal(results, 1234)
    })

    it('should return numeric expression', function () {
      const results = parse('<?php return 123 * 456 + 890')
      assert.equal(results, '123 * 456 + 890')
    })

    it('should return boolean literal', function () {
      const results = parse('<?php return false')
      assert.isFalse(results)
    })

    it('should return null literal', function () {
      const results = parse('<?php return null')
      assert.isNull(results)
    })

    it('should report error for malformed input', function () {
      assert.throws(() => parse('<?php return array("foobar"'), 'expected array close, got Token[eof, ]')
      assert.throws(() => parse('<?php return ["foobar"'), 'expected array close, got Token[eof, ]')
      assert.throws(() => parse("<?php return array( 'name' => );"), 'expected value, got Token[closeparen, )]')
    })
  })

  describe('basic arrays', function () {
    it('should return map for array with one value', function () {
      const results = parse('<?php return array("name" => "value",);')
      assert.lengthOf(results, 1)
      assert.equal(results.get('name'), 'value')
    })

    it('should return map for arrays delineated using []', function () {
      const results = parse(`<?php
return [
  'enabled' => true,
  'name'    => 'Helix Swarm',
  'icon'    => 'URL',
];
`)
      assert.lengthOf(results, 3)
      assert.isTrue(results.get('enabled'))
      assert.equal(results.get('name'), 'Helix Swarm')
      assert.equal(results.get('icon'), 'URL')
    })

    it('should return map of nulls for array without values', function () {
      const results = parse(`<?php
return array(
  "string",
  "number",
  "boolean",
  "null",
);
`)
      assert.lengthOf(results, 4)
      assert.equal(results.get('0'), 'string')
      assert.equal(results.get('1'), 'number')
      assert.equal(results.get('2'), 'boolean')
      assert.equal(results.get('3'), 'null')
    })

    it('should return map with mixed integer and absent indices', function () {
      // PHP allows rather peculiar "arrays"
      const results = parse(`<?php
return array(
  0 => "zero",
  "one",
  10 => "ben10",
  "null",
  'foo' => 'bar'
);
`)
      assert.lengthOf(results, 5)
      assert.equal(results.get('0'), 'zero')
      assert.equal(results.get('1'), 'one')
      assert.equal(results.get('10'), 'ben10')
      assert.equal(results.get('11'), 'null')
      assert.equal(results.get('foo'), 'bar')
    })

    it('should return map for array with multiple value', function () {
      const results = parse(`<?php
return array(
  "string" => "value",
  "number" => 12345,
  "boolean" => true,
  "null" => null,
);
`)
      assert.lengthOf(results, 4)
      assert.equal(results.get('string'), 'value')
      assert.equal(results.get('number'), 12345)
      assert.isTrue(results.get('boolean'))
      assert.isNull(results.get('null'))
    })

    it('should return map for array with an array value', function () {
      const results = parse(`<?php
return array(
  'markdown' => array(
    array(
      'id'    => 'jobs',
      'regex' => '', // the regular expression used to match the job keyword, default is empty
      'url'   => '', // url that matching job numbers are appended to, default is empty
    ),
  ),
);
`)
      assert.lengthOf(results, 1)
      assert.isTrue(results.has('markdown'))
      const markdown = results.get('markdown')
      assert.lengthOf(markdown, 1)
      const onlyChild = markdown.get('0')
      assert.lengthOf(onlyChild, 3)
      assert.equal(onlyChild.get('id'), 'jobs')
      assert.equal(onlyChild.get('regex'), '')
      assert.equal(onlyChild.get('url'), '')
    })
  })

  describe('basic nested arrays', function () {
    it('should return map of maps for nested arrays', function () {
      const results = parse(`<?php
return array(
  "string" => "value",
  "array" => array(
    "boolean" => true,
    "null" => null,
  ),
);
`)
      assert.lengthOf(results, 2)
      assert.equal(results.get('string'), 'value')
      const nested = results.get('array')
      assert.lengthOf(nested, 2)
      assert.isTrue(nested.get('boolean'))
      assert.isNull(nested.get('null'))
    })
  })

  describe('complex parsing', function () {
    it('should parse a typical config file', function () {
      const contents = fs.readFileSync('test/fixtures/swarm-config.php', 'utf8')
      const results = parse(contents)
      assert.lengthOf(results, 6)
      assert.equal(results.get('mail').get('transport').get('host'), 'localhost')
      const saml = results.get('saml')
      assert.lengthOf(saml, 3)
      assert.equal(saml.get('sp').get('assertionConsumerService').get('url'), 'https://swarm.doc:8043')
      assert.equal(saml.get('idp').get('entityId'), 'urn:auth-service:idp')
      const cert = saml.get('idp').get('x509cert')
      assert.include(cert, 'BEGIN CERTIFICATE')
      assert.include(cert, 'END CERTIFICATE')
    })

    it('should parse the example config file', function () {
      const contents = fs.readFileSync('test/fixtures/swarm-example.php', 'utf8')
      const results = parse(contents)
      assert.lengthOf(results, 35)
      assert.equal(results.get('environment').get('mode'), 'production')
      assert.equal(results.get('slack').get('token'), 'TOKEN')
    })
  })
})
