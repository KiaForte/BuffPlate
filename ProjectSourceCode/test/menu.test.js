const assert  = require('assert');
const fixture = require('../src/init_data/menu_fixture.json');
const { parseItems } = require('../src/api/menu');

const FIXTURE_DATE = fixture.days[0].date; // '2026-10-26'
const CTX = { hallId: 'c5', stationLabel: 'Meal of the Day' };

describe('parseItems — positive', () => {
  let items;
  before(() => { items = parseItems(fixture.days, FIXTURE_DATE, CTX); });

  it('returns at least one item', () => {
    assert(items.length > 0, 'expected at least one item');
  });

  it('item name is a string', () => {
    assert(typeof items[0].name === 'string', 'name should be a string');
  });

  it('Shredded Jackfruit Shawrma has protein 4', () => {
    const item = items.find(i => i.name === 'Shredded Jackfruit Shawrma');
    assert(item, 'Shredded Jackfruit Shawrma not found');
    assert.strictEqual(item.protein, 4.0);
  });

  it('section header text becomes the section field', () => {
    const item = items.find(i => i.name === 'Shredded Jackfruit Shawrma');
    assert.strictEqual(item.section, 'Middleterranean');
  });
});

describe('parseItems — negative', () => {
  it('returns empty array when the target date is not in days', () => {
    const result = parseItems(fixture.days, '1999-01-01', CTX);
    assert.deepStrictEqual(result, []);
  });

  it('returns empty array when a day has only section headers', () => {
    const days = [{
      date: '2026-01-01',
      menu_items: [
        { is_section_title: true, text: 'Header Only' },
      ],
    }];
    const result = parseItems(days, '2026-01-01', CTX);
    assert.deepStrictEqual(result, []);
  });
});
