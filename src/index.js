const { clusterApiUrl, PublicKey } = require('@solana/web3.js');
const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { fromWeb3JsPublicKey, toWeb3JsPublicKey } = require('@metaplex-foundation/umi-web3js-adapters');
const { createMetadataAccountV3, updateMetadataAccountV2 } = require('@metaplex-foundation/mpl-token-metadata');

class SplTokenMetaData {

    /**
     * @param {Object}
     */
    umi;

    /**
     * @param {PublicKey}
     */
    mplProgramId;

    constructor(endpoint) {
        this.umi = createUmi(clusterApiUrl(endpoint))
        this.mplProgramId = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
    }

    /**
     * @param {Object} metadata 
     * @return {Boolean}
     * @throws {Error}
     */
    async validateTokenMetadata(metadata) {
        if (!metadata.symbol) {
            throw new Error("Token symbol required!");
        }

        if (!metadata.name) {
            throw new Error("Token name require!");
        }

        if (!metadata.uri) {
            throw new Error("Token uri required!");
        }

        let jsonData = await fetch(metadata.uri)
        .then(response => response.json())
        .catch((error) => {
            console.log(error)
            throw new Error("Token uri have json problem!");
        });

        if (!jsonData.image) {
            throw new Error("Token image required!");
        }

        if (!jsonData.description) {
            throw new Error("Token description required!");
        }

        if (!jsonData.name || jsonData.name != metadata.name) {
            throw new Error("Token name not same with uri!");
        }

        if (!jsonData.symbol || jsonData.symbol != metadata.symbol) {
            throw new Error("Token symbol not same with uri!");
        }

        return true;
    }

    /**
     * @param {String} from 
     * @param {String} tokenAddress 
     * @param {Object} metadata 
     * @returns {Object}
     */
    async preapreArgs(from, tokenAddress, metadata) {
        await this.validateTokenMetadata(metadata);

        const fromPublicKey = fromWeb3JsPublicKey(new PublicKey(from));
        
        const args = {
            data: {
                name: metadata.name,
                symbol: metadata.symbol,
                uri: metadata.uri,
                sellerFeeBasisPoints: 0,
                collection: null,
                creators: [
                    {
                        address: fromPublicKey, 
                        verified: true, 
                        share: 100
                    }
                ],
                uses: null
            },
            isMutable: true,
            collectionDetails: null
        }

        const signer = {
            publicKey: fromPublicKey,
            signMessage: async (message) => {
                return new Promise((resolve) => {
                    resolve(message);
                });
            },
            signTransaction: async (transaction) => {
                return new Promise((resolve) => {
                    resolve(transaction);
                });
            },
            signAllTransactions: async (transactions) => {
                return new Promise((resolve) => {
                    resolve(transactions);
                });
            }
        }

        const mint = new PublicKey(tokenAddress);
        const [metadataPublicKey] = PublicKey.findProgramAddressSync([
            Buffer.from("metadata"),
            this.mplProgramId.toBytes(),
            mint.toBytes()
        ], this.mplProgramId);

        const accounts = {
            metadata: fromWeb3JsPublicKey(metadataPublicKey),
            mint: fromWeb3JsPublicKey(mint), 
            payer: signer,
            mintAuthority: signer,
            updateAuthority: fromPublicKey
        }
        
        return {...accounts, ...args}
    }


    /**
     * @param {Object} builder 
     * @returns {Object}
     */
    txInstructionCreator(builder) {
        const ix = builder.getInstructions()[0];
        ix.keys = ix.keys.map((key) => {
            const newKey = {...key};
            newKey.pubkey = toWeb3JsPublicKey(key.pubkey);
            return newKey;
        });
        return ix;
    }

    /**
     * @param {String} from 
     * @param {String} tokenAddress 
     * @param {Object} metadata 
     * @returns {Object}
     */
    async createSplTokenMetadata(from, tokenAddress, metadata) {
        const args = await this.preapreArgs(from, tokenAddress, metadata);
        return this.txInstructionCreator(createMetadataAccountV3(this.umi, args));
    }

    /**
     * @param {String} from 
     * @param {String} tokenAddress 
     * @param {Object} metadata 
     * @returns {Object}
     */
    async updateSplTokenMetadata(from, tokenAddress, metadata) {
        const args = await this.preapreArgs(from, tokenAddress, metadata);
        return this.txInstructionCreator(updateMetadataAccountV2(this.umi, args));
    }
}

module.exports = SplTokenMetaData;