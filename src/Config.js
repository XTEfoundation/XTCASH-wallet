// Copyright (C) 2018, Zpalmtree
//
// Please see the included LICENSE file for more information.


import { MixinLimit, MixinLimits, Daemon } from 'traaittcash-wallet-backend';

import {
    derivePublicKey, generateKeyDerivation, generateRingSignatures,
    deriveSecretKey, generateKeyImage, checkRingSignature,
} from './NativeCode';

/**
 * traaittcash-wallet-backend's MixinLimits.getMixinLimitsByHeight walks the
 * limits from the highest height down and keeps overwriting, so past every
 * fork it returns the OLDEST limit (max 4) while getDefaultMixinByHeight
 * returns the newest default (8). Every send then fails with MIXIN_TOO_BIG.
 * Use the newest limit whose height has been passed, like the default does.
 */
class XTCASHMixinLimits extends MixinLimits {
    getMixinLimitsByHeight(height) {
        for (const limit of this.limits) {
            if (height > limit.height) {
                return [limit.minMixin, limit.maxMixin];
            }
        }

        return [0, Math.pow(2, 64)];
    }
}

const Config = new function() {
    /**
     * If you can't figure this one out, I don't have high hopes
     */
    this.coinName = 'XTCASH';

    /**
     * Prefix for URI encoded addresses
     */
    this.uriPrefix = 'xtcash://';

    /**
     * How often to save the wallet, in milliseconds
     */
    this.walletSaveFrequency = 60 * 1000;

    /**
     * The amount of decimal places your coin has. XTCASH has two decimals
     * (traaittXTCASH CRYPTONOTE_DISPLAY_DECIMAL_POINT = 2)
     */
    this.decimalPlaces = 2;

    /**
     * The address prefix your coin uses - you can find this in CryptoNoteConfig.h.
     * traaittXTCASH CRYPTONOTE_PUBLIC_ADDRESS_BASE58_PREFIX = 925524, which
     * encodes to addresses starting with "cash" (98 characters).
     */
    this.addressPrefix = 925524;

    /**
     * Request timeout for daemon operations in milliseconds
     */
    this.requestTimeout = 10 * 1000;

    /**
     * The block time of your coin, in seconds
     */
    this.blockTargetTime = 32;

    /**
     * How often to process blocks, in millseconds
     */
    this.syncThreadInterval = 4;

    /**
     * How often to update the daemon info, in milliseconds
     */
    this.daemonUpdateInterval = 10 * 1000;

    /**
     * How often to check on locked transactions
     */
    this.lockedTransactionsCheckInterval = 10 * 3000;

    /**
     * The amount of blocks to process per 'tick' of the mainloop. Note: too
     * high a value will cause the event loop to be blocked, and your interaction
     * to be laggy.
     */
    this.blocksPerTick = 100;

    /**
     * Your coins 'ticker', generally used to refer to the coin, i.e. 123 XTCASH
     */
    this.ticker = 'XTCASH';

    /**
     * Most people haven't mined any blocks, so lets not waste time scanning
     * them
     */
    this.scanCoinbaseTransactions = false;

    /**
     * The minimum fee allowed for transactions, in ATOMIC units. XTCASH MINIMUM_FEE is 100 (flat, no fee-per-byte)
     */
    this.minimumFee = 100;

    /**
     * Mapping of height to mixin maximum and mixin minimum
     */
    this.mixinLimits = new XTCASHMixinLimits([
        /* Height: 440,000, minMixin: 0, maxMixin: 4, defaultMixin: 3 */
        new MixinLimit(440000, 0, 4, 3),

        /* At height of 800000, minMixin: 0, maxMixin: 5 */
        new MixinLimit(800000, 0, 5, 5),

        /* At height of 1000000, minMixin: 0, maxMixin: 8 */
        new MixinLimit(1000000, 0, 8, 8),
    ], 3 /* Default mixin of 3 before block 440,000 */);

    /**
     * The length of a standard address for your coin
     */
    this.standardAddressLength = 98;

    /**
     * The length of an integrated address for your coin - It's the same as
     * a normal address, but there is a paymentID included in there - since
     * payment ID's are 64 chars, and base58 encoding is done by encoding
     * chunks of 8 chars at once into blocks of 11 chars, we can calculate
     * this automatically
     */
    this.integratedAddressLength = 98 + ((64 * 11) / 8);

    /**
     * Use our native func instead of JS slowness
     */
    this.derivePublicKey = derivePublicKey;

    /**
     * Use our native func instead of JS slowness
     */
    this.generateKeyDerivation = generateKeyDerivation;

    /**
     * Use our native func instead of JS slowness
     */
    this.generateRingSignatures = generateRingSignatures;

    /**
     * Use our native func instead of JS slowness
     */
    this.deriveSecretKey = deriveSecretKey;

    /**
     * Use our native func instead of JS slowness
     */
    this.generateKeyImage = generateKeyImage;

    /**
     * Use our native func instead of JS slowness
     */
    this.checkRingSignatures = checkRingSignature;

    /**
     * Memory to use for storing downloaded blocks - 3MB
     */
    this.blockStoreMemoryLimit = 1024 * 1024 * 3;

    /**
     * Amount of blocks to request from the daemon at once
     */
    this.blocksPerDaemonRequest = 100;

    /**
     * Unix timestamp of the time your chain was launched.
     * XTCASH: timestamp of block 1 (the genesis block header reports 0).
     * A launch time at or after the real one keeps date-based scan heights
     * at or below the true height, so no transactions are skipped.
     */
    this.chainLaunchTimestamp = new Date(1694704526 * 1000);

    /**
     * Fee to take on all transactions, in percentage. XTCASH uses 0% dev fee
     */
    this.devFeePercentage = 0;

    /**
     * Address to send dev fee to. Not used for XTCASH (devFeePercentage = 0)
     */
    this.devFeeAddress = '';

    /**
     * Base url for price API
     *
     * The program *should* fail gracefully if your coin is not supported, or
     * you just set this to an empty string. If you have another API you want
     * it to support, you're going to have to modify the code in Currency.js.
     */
    this.priceApiLink = 'https://api.coingecko.com/api/v3/simple/price';

    /**
     * Default daemon. Daemon's constructor is (host, port, isCacheApi, ssl).
     * The third argument must stay false: true would mark this as a cache API.
     * The public node list is fetched from nodeListURL; do not hardcode nodes here.
     * XTCASH daemon RPC port is 14423 (plain HTTP). main.trrxitte.com:443
     * serves XTE, and the XTCASH HTTPS proxy lives under a path (/xtcash/)
     * which Daemon cannot express, so use the RPC port directly.
     */
    this.defaultDaemon = new Daemon('main.trrxitte.com', 14423, false, false);

    /**
     * Persisted form of defaultDaemon. See NodeAddress.js.
     */
    this.defaultNode = 'main.trrxitte.com:14423:plain';

    /**
     * A link to where a bug can be reported for your wallet. Please update
     * this if you are forking, so we don't get reported bugs for your wallet...
     *
     */
    this.repoLink = 'https://github.com/XTEfoundation/XTCASH-wallet';

    /**
     * This only controls the name in the settings screen.
     */
    this.appName = 'XTCASH';

    /**
     * Slogan phrase during wallet CreateScreen
     */
    this.sloganCreateScreen = 'Fast. Safe. Easy.';

    /**
     * Displayed in the settings screen
     */
    this.appVersion = 'v1.0.0';

    /**
     * Base URL for us to chuck a hash on the end, and find a transaction
     */
    this.explorerBaseURL = 'https://explorer.traaittxtcash.com/#blockchain_transaction?hash=';

    /**
     * A link to your app on the Apple app store. Currently blank because we
     * haven't released for iOS yet...
     */
    this.appStoreLink = '';

    /**
     * A link to your app on the google play store
     */
    this.googlePlayLink = 'https://play.google.com/store/apps/details?id=io.traaitt.xtcash';

    /**
     * A url to fetch node info from. Should follow the turtlepay format
     * detailed here: https://docs.turtlepay.io/blockapi/
     */
    this.nodeListURL = 'https://raw.githubusercontent.com/XTEfoundation/XTCASH-wallet/main/nodes.json';
};

module.exports = Config;
