//
// Copyright 2021 Perforce Software
//
const { compileFilter, compileSorter } = require('scim-query-filter-parser')

//
// Query parameters as defined in RFC 7644 sec. 3.4.2
//
module.exports = class Query {
  constructor ({ filter, sortBy, sortOrder, startIndex, count, attributes, excludedAttributes } = {}) {
    this._filter = filter
    this._sortBy = sortBy
    this._sortOrder = sortOrder
    this._startIndex = startIndex
    this._count = count
    this._attributes = attributes
    this._excludedAttributes = excludedAttributes
  }

  filterResults (results) {
    if (this.filter) {
      results = results.filter(compileFilter(this.filter))
    }
    return results
  }

  sortResults (results) {
    if (this.sortBy) {
      results = results.sort(compileSorter(this.sortBy))
    }
    if (this.sortOrder === 'descending') {
      results.reverse()
    }
    return results
  }

  get filter () {
    return this._filter
  }

  get sortBy () {
    return this._sortBy
  }

  get sortOrder () {
    return this._sortOrder
  }

  get startIndex () {
    return this._startIndex
  }

  get count () {
    return this._count
  }

  get attributes () {
    return this._attributes
  }

  get excludedAttributes () {
    return this._excludedAttributes
  }
}
