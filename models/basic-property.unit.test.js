const testHelpers = require('@quoin/node-test-helpers');

const moduleToTest = require('./basic-property');

const expect = testHelpers.expect;

describe("lib/models/basic-property", () => {
    it("should expose a function", () => {
        expect(moduleToTest).to.be.a('function')
            .to.have.lengthOf(5)
            .to.have.property('name').to.equal('BasicProperty');
    });
});
