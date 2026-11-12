const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../src/app');
const db = require('../src/db');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('node:crypto');

chai.use(chaiHttp);
const {expect} = chai;

describe('Welcome route', () => {
  it('returns the default welcome message', async () => {
    const res = await chai.request(app).get('/welcome');
    expect(res).to.have.status(200);
    expect(res.body).to.deep.equal({
      status: 'success',
      message: 'Welcome!',
    });
  });
});

describe('POST /register', () => {
  const username = `test_${randomUUID()}`;
  const email = `${username}@colorado.edu`;
  const password = 'TestPassword123!';

  async function removeTestUser() {
    await db.query('DELETE FROM users WHERE username = $1', [username]);
  }

  beforeEach(removeTestUser);
  afterEach(removeTestUser);

  it('creates one user for valid form input and stores a bcrypt hash', async () => {
    const res = await chai.request(app)
      .post('/register')
      .type('form')
      .send({ username, email, password })
      .redirects(0);

    expect(res).to.have.status(302);
    expect(res).to.have.header('location', '/login');

    const { rows } = await db.query(
      'SELECT username, email, password FROM users WHERE username = $1',
      [username]
    );
    expect(rows).to.have.lengthOf(1);
    expect(rows[0].username).to.equal(username);
    expect(rows[0].email).to.equal(email);
    expect(rows[0].password).not.to.equal(password);
    expect(await bcrypt.compare(password, rows[0].password)).to.equal(true);
  });

  it('rejects a missing password without creating a user', async () => {
    const res = await chai.request(app)
      .post('/register')
      .type('form')
      .send({ username, email })
      .redirects(0);

    expect(res).to.have.status(400);
    expect(res.text).to.include('Invalid input.');

    const { rows } = await db.query(
      'SELECT username FROM users WHERE username = $1',
      [username]
    );
    expect(rows).to.have.lengthOf(0);
  });
});