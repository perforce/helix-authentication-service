//
// Copyright 2026 Perforce Software
//
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { valuesEqual } from 'helix-auth-svc/lib/features/scim/data/models/common.js'

describe('common model helpers', function () {
  describe('valuesEqual', function () {
    it('should be case-sensitive by default', function () {
      assert.isTrue(valuesEqual('joeuser', 'joeuser', false))
      assert.isFalse(valuesEqual('joeuser', 'JoeUser', false))
    })

    it('should ignore case when caseInsensitive is true', function () {
      assert.isTrue(valuesEqual('joeuser', 'JoeUser', true))
      assert.isTrue(valuesEqual('JOEUSER', 'joeuser', true))
      assert.isFalse(valuesEqual('joeuser', 'otheruser', true))
    })
  })
})
