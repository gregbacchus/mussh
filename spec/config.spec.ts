import {Config} from '../config';

const config = new Config([], [{
  hostname: 'test1',
  id: 'test1',
  tags: [],
}, {
  hostname: 'test2',
  id: 'test2',
  tags: ['a'],
}, {
  hostname: 'test3',
  id: 'test3',
  tags: ['a', 'b'],
}, {
  hostname: 'test4',
  id: 'test4',
  tags: ['a', 'b', 'c'],
}, {
  hostname: 'test5',
  id: 'test5',
  tags: ['b', 'c'],
}, {
  hostname: 'test6',
  id: 'test6',
  tags: ['d'],
}]);

describe('Config', () => {
  describe('getMatchingServers', () => {
    it('must return all when no ids or tags', () => {
      const servers = config.getMatchingServers();
      expect(servers.length).toBe(6);
    });

    it('must match single id', () => {
      const servers = config.getMatchingServers(['test1'], []);
      expect(servers.length).toBe(1);
      expect(servers).toContain(jasmine.objectContaining({id: 'test1'}));
    });

    it('must match multiple ids by union', () => {
      const servers = config.getMatchingServers(['test1', 'test2'], []);
      expect(servers.length).toBe(2);
      expect(servers).toContain(jasmine.objectContaining({id: 'test1'}));
      expect(servers).toContain(jasmine.objectContaining({id: 'test2'}));
    });

    it('must match multiple ids in different order', () => {
      const servers = config.getMatchingServers(['test4', 'test1'], []);
      expect(servers.length).toBe(2);
      expect(servers).toContain(jasmine.objectContaining({id: 'test1'}));
      expect(servers).toContain(jasmine.objectContaining({id: 'test4'}));
    });

    it('must match single tag', () => {
      const servers = config.getMatchingServers([], ['a']);
      expect(servers.length).toBe(3);
      expect(servers).toContain(jasmine.objectContaining({id: 'test2'}));
      expect(servers).toContain(jasmine.objectContaining({id: 'test3'}));
      expect(servers).toContain(jasmine.objectContaining({id: 'test4'}));
    });

    it('must match multiple tags by intersection', () => {
      const servers = config.getMatchingServers([], ['b', 'a']);
      expect(servers.length).toBe(2);
      expect(servers).toContain(jasmine.objectContaining({id: 'test3'}));
      expect(servers).toContain(jasmine.objectContaining({id: 'test4'}));
    });
  });
});
