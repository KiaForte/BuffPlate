process.env.NODE_ENV = 'test';

exports.mochaHooks = {
  async afterAll() {
    await require('../src/db').end();
  },
};
