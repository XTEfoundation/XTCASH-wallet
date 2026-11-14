/*
 * Sync regressions (v1.0.1):
 *  - date based scan heights must never land past the real chain height
 *    (blocks average ~48 s, not the 32 s target)
 *  - the default node is the TLS proxy https://main.trrxitte.com/xtcash
 *  - sync requests get enough time for slow sparse batches
 */
import moment from 'moment';

jest.mock('react-native', () => ({
    Platform: { OS: 'ios' },
    NativeModules: {},
    Alert: { alert: jest.fn() },
    ToastAndroid: {},
    Text: 'Text',
}));
jest.mock('react-navigation', () => ({ StackActions: {}, NavigationActions: {} }));
jest.mock('../Globals', () => ({ Globals: { logger: { addLogMessage: jest.fn() } } }));

const Config = require('../Config');
const { getApproximateBlockHeight, dateToScanHeight } = require('../Utilities');
const { parseNode, formatListedNode } = require('../NodeAddress');
const { Daemon } = require('traaittcash-wallet-backend');

describe('scan height from a date', () => {
    const cps = Config.scanHeightCheckpoints;

    test('checkpoints are real and ascending', () => {
        expect(cps.length).toBeGreaterThan(10);
        for (let i = 1; i < cps.length; i++) {
            expect(cps[i][0]).toBeGreaterThan(cps[i - 1][0]);
            expect(cps[i][1]).toBeGreaterThan(cps[i - 1][1]);
        }
    });

    test('never above the real height at a checkpoint', () => {
        for (const [height, time] of cps) {
            const guess = getApproximateBlockHeight(new Date(time * 1000));
            expect(guess).toBeLessThanOrEqual(height);
            expect(height - guess).toBeLessThan(50000);
        }
    });

    test('a month pick starts before that month, below the tip', () => {
        const [lastHeight, lastTime] = cps[cps.length - 1];
        const scan = dateToScanHeight(moment(lastTime * 1000));
        expect(scan).toBeLessThan(lastHeight);
        expect(scan).toBeGreaterThan(lastHeight - 10000);
        /* The old 32 s formula put "now" ~1M blocks past the tip */
        const old = Math.floor((lastTime * 1000 - Config.chainLaunchTimestamp) / 1000 / Config.blockTargetTime);
        expect(old).toBeGreaterThan(lastHeight);
    });

    test('future dates are clamped to now', () => {
        expect(dateToScanHeight(moment().add(5, 'years'))).toBeLessThanOrEqual(getApproximateBlockHeight(new Date()));
    });
});

describe('default node', () => {
    test('TLS proxy on port 443 with a path prefix', () => {
        expect(Config.defaultNode).toBe('main.trrxitte.com/xtcash:443:ssl');
        expect(parseNode(Config.defaultNode)).toEqual({ host: 'main.trrxitte.com/xtcash', port: 443, ssl: true });
        expect(Config.legacyDefaultNodes).toContain('main.trrxitte.com:14423:plain');
    });

    test('daemon builds URLs with the path prefix', () => {
        const d = new Daemon('main.trrxitte.com/xtcash', 443, false, true);
        expect(d.urlFor('https', '/info')).toBe('https://main.trrxitte.com:443/xtcash/info');
        const plain = new Daemon('eu-west.trrxitte.com', 14423, false, false);
        expect(plain.urlFor('http', '/getwalletsyncdata')).toBe('http://eu-west.trrxitte.com:14423/getwalletsyncdata');
    });

    test('listed nodes round-trip', () => {
        const nodes = require('../../nodes.json').nodes;
        expect(formatListedNode(nodes[0])).toBe(Config.defaultNode);
        for (const n of nodes) {
            expect(n.url.startsWith('main.trrxitte.com') || n.url.startsWith('eu-west.trrxitte.com')).toBe(true);
        }
    });

    test('timeouts and batch size fit slow sparse batches', () => {
        expect(Config.requestTimeout).toBeGreaterThanOrEqual(60000);
        expect(Config.blocksPerDaemonRequest).toBeLessThanOrEqual(50);
    });
});
