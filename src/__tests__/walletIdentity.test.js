import Config from '../Config';
import { formatListedNode, formatNode, parseNode, sameNode } from '../NodeAddress';

jest.mock('react-native', () => ({
    Platform: { OS: 'ios' },
    NativeModules: {},
}));

describe('XTCASH network identity', () => {
    test('uses the traaittXTCASH coin parameters', () => {
        expect(Config.coinName).toBe('XTCASH');
        expect(Config.ticker).toBe('XTCASH');
        expect(Config.addressPrefix).toBe(925524);
        expect(Config.decimalPlaces).toBe(2);
        expect(Config.blockTargetTime).toBe(32);
        expect(Config.minimumFee).toBe(100);
        expect(Config.standardAddressLength).toBe(98);
        expect(Config.integratedAddressLength).toBe(186);
        expect(Config.uriPrefix).toBe('xtcash://');
        expect(Config.appName).toBe('XTCASH');
        expect(Config.appVersion).toBe('v1.0.0');
    });

    test('mixin limits follow CryptoNoteConfig.h', () => {
        expect(Config.mixinLimits.getDefaultMixinByHeight(0)).toBe(3);
        expect(Config.mixinLimits.getMixinLimitsByHeight(440001)).toEqual([0, 4]);
        expect(Config.mixinLimits.getMixinLimitsByHeight(800001)).toEqual([0, 5]);
        expect(Config.mixinLimits.getMixinLimitsByHeight(2056799)).toEqual([0, 8]);
        expect(Config.mixinLimits.getDefaultMixinByHeight(2056799)).toBe(8);
    });

    test('the default mixin passes the backend mixin check at the current height', () => {
        const { validateMixin } = require('traaittcash-wallet-backend/dist/lib/ValidateParameters');
        const height = 2056799;
        const mixin = Config.mixinLimits.getDefaultMixinByHeight(height);

        expect(validateMixin(mixin, height, Config).errorCode).toBe(0);
        expect(validateMixin(9, height, Config).errorCode).not.toBe(0);
    });

    test('default daemon is the plain XTCASH RPC node, not a cache API', () => {
        expect(Config.defaultDaemon.host).toBe('main.trrxitte.com');
        expect(Config.defaultDaemon.port).toBe(14423);
        expect(Config.defaultDaemon.ssl).toBe(false);
        expect(Config.defaultDaemon.isCacheApi).toBe(false);
        expect(Config.defaultNode).toBe('main.trrxitte.com:14423:plain');
        expect(parseNode(Config.defaultNode)).toEqual({ host: 'main.trrxitte.com', port: 14423, ssl: false });
        expect(Config.nodeListURL).toBe(
            'https://raw.githubusercontent.com/XTEfoundation/XTCASH-wallet/main/nodes.json',
        );
        expect(Config.repoLink).toBe('https://github.com/XTEfoundation/XTCASH-wallet');
    });

    test('bundled node list only has XTCASH RPC nodes', () => {
        const { nodes } = require('../../nodes.json');
        expect(nodes.length).toBeGreaterThan(0);
        for (const node of nodes) {
            expect(node.port).toBe(14423);
            expect(node.cache).toBe(false);
        }
    });
});

describe('node addresses', () => {
    test('round-trips ssl and plain nodes', () => {
        expect(parseNode(formatNode('main.trrxitte.com', 443, true))).toEqual({
            host: 'main.trrxitte.com',
            port: 443,
            ssl: true,
        });
        expect(parseNode(formatNode('eu-west.trrxitte.com', 14423, false))).toEqual({
            host: 'eu-west.trrxitte.com',
            port: 14423,
            ssl: false,
        });
    });

    test('legacy connection strings keep TLS only on port 443', () => {
        expect(parseNode('main.trrxitte.com:443').ssl).toBe(true);
        expect(parseNode('main.trrxitte.com:14423').ssl).toBe(false);
    });

    test('matches a listed node against the stored address', () => {
        const listed = {
            url: 'eu-west.trrxitte.com',
            port: 14423,
            ssl: false,
        };

        expect(formatListedNode(listed)).toBe('eu-west.trrxitte.com:14423:plain');
        expect(sameNode('eu-west.trrxitte.com:14423:plain', listed)).toBe(true);
        expect(sameNode('eu-west.trrxitte.com:14423', listed)).toBe(true);
        expect(sameNode('main.trrxitte.com:443:ssl', listed)).toBe(false);
    });
});
