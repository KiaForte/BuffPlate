const { expect } = require('chai');
const { parseItems } = require('../src/services/menu');
const fixture = require('../src/init_data/menu_fixture.json');

describe('parseItems', () => {
  const date  = fixture.days[0].date;
  const items = parseItems(fixture.days, date);

  it('returns at least one item', () => {
    expect(items).to.have.length.greaterThan(0);
  });

  it('preserves food name as a non-empty string', () => {
    expect(items[0].name).to.be.a('string').and.not.be.empty;
  });

  it('parses protein as a number', () => {
    // Seasoned Ground Beef is the first food item (18 g protein)
    const beef = items.find(i => i.name === 'Seasoned Ground Beef');
    expect(beef).to.exist;
    expect(beef.protein).to.equal(18);
  });

  it('assigns the correct station', () => {
    const beef = items.find(i => i.name === 'Seasoned Ground Beef');
    expect(beef.station).to.equal('The Grange: B.Y.O Burrito, Bowl, or Taco');
  });

  it('handles null nutrition values without throwing', () => {
    // Grilled Salmon has null g_fiber and g_sugar; calories/protein should still parse
    const salmon = items.find(i => i.name === 'Grilled Salmon');
    expect(salmon).to.exist;
    expect(salmon.calories).to.equal(230);
    expect(salmon.protein).to.equal(25);
  });

  it('returns an empty array for a date not in the fixture', () => {
    const result = parseItems(fixture.days, '1900-01-01');
    expect(result).to.deep.equal([]);
  });
});
