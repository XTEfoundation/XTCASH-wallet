/*
 * Address handling for the XTCASH network (traaittXTCASH prefix 925524).
 *
 * The expected address below was generated from the fixed seed and then
 * checked against the XTCASH daemon on main.trrxitte.com: getblocktemplate
 * accepted it as wallet_address, and rejected the same string with its last
 * character changed ("Failed to parse wallet address").
 */
import Config from '../Config';

import { CryptoUtils } from 'traaittcash-wallet-backend/dist/lib/CnUtils';
import { MergeConfig } from 'traaittcash-wallet-backend/dist/lib/Config';
import { validateAddress } from 'traaittcash-wallet-backend/dist/lib/ValidateParameters';

jest.mock('react-native', () => ({
    Platform: { OS: 'ios' },
    NativeModules: {},
}));

const SEED = 'a'.repeat(64);
const EXPECTED_ADDRESS =
    'cashbvjQb3UFWfZ1R9tfUPKHQ7j2PF9cHRpV4MyP7hTbJGUHqKANqqz9wMnyZxSS5STPW2DYtsynUTzX68sDEMBR3uBc69tDHU';
const EXPECTED_SPEND_PUB = 'ef81d7082f56c22352270e3f046d4e299f53e018ce946197ffbb56e976673b26';
const EXPECTED_VIEW_PUB = '40a11ebaf1356e9f683f49605d9dc35f0b59cd950da15f72f4f81763744c84b5';

/* The app's Config, minus the native crypto hooks (not available under jest). */
const config = MergeConfig({
    addressPrefix: Config.addressPrefix,
    decimalPlaces: Config.decimalPlaces,
    standardAddressLength: Config.standardAddressLength,
    integratedAddressLength: Config.integratedAddressLength,
});

describe('XTCASH addresses', () => {
    test('a fixed seed gives the known XTCASH address', async () => {
        const wallet = await CryptoUtils(config).createAddressFromSeed(SEED);

        expect(wallet.address).toBe(EXPECTED_ADDRESS);
        expect(wallet.address.startsWith('cash')).toBe(true);
        expect(wallet.address.length).toBe(Config.standardAddressLength);
        expect(wallet.spend.publicKey).toBe(EXPECTED_SPEND_PUB);
        expect(wallet.view.publicKey).toBe(EXPECTED_VIEW_PUB);
    });

    test('the same keys round-trip through the mnemonic', async () => {
        const utils = CryptoUtils(config);
        const fromSeed = await utils.createAddressFromSeed(SEED);
        const fromMnemonic = await utils.createAddressFromMnemonic(fromSeed.mnemonic);

        expect(fromMnemonic.address).toBe(EXPECTED_ADDRESS);
    });

    test('decodes with the XTCASH prefix', async () => {
        const decoded = await CryptoUtils(config).decodeAddress(EXPECTED_ADDRESS);

        expect(Number(decoded.prefix)).toBe(925524);
        expect(decoded.publicSpendKey).toBe(EXPECTED_SPEND_PUB);
        expect(decoded.publicViewKey).toBe(EXPECTED_VIEW_PUB);
    });

    test('the wallet backend accepts XTCASH addresses and rejects XTE ones', async () => {
        expect(validateAddress(EXPECTED_ADDRESS, false, config)).toBe(true);
        expect(validateAddress(EXPECTED_ADDRESS.slice(0, -1) + 'V', false, config)).toBe(false);

        const xteConfig = MergeConfig({ ...config, addressPrefix: 1334 });
        const xteAddress = (await CryptoUtils(xteConfig).createAddressFromSeed(SEED)).address;

        expect(xteAddress.startsWith('XT')).toBe(true);
        expect(validateAddress(xteAddress, false, config)).toBe(false);
    });

    test('integrated addresses have the configured length', async () => {
        const utils = CryptoUtils(config);
        const integrated = await utils.createIntegratedAddress(EXPECTED_ADDRESS, 'b'.repeat(64));

        expect(integrated.startsWith('cash')).toBe(true);
        expect(integrated.length).toBe(Config.integratedAddressLength);
        expect(validateAddress(integrated, true, config)).toBe(true);
        expect(validateAddress(integrated, false, config)).toBe(false);
    });
});
