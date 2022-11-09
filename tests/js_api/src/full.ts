import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import type { EventRecord, ExtrinsicStatus, H256 } from '@polkadot/types/interfaces';
import type { ISubmittableResult, SignatureOptions } from '@polkadot/types/types';
import config from './config';

const keyring = new Keyring({ type: 'sr25519' });

async function createApi(): Promise<ApiPromise> {
    const provider = new WsProvider(config.ApiURL);

    // Create the API and wait until ready
    return ApiPromise.create({
        provider,
        rpc: {
            kate: {
                blockLength: {
                    description: "Get Block Length",
                    params: [
                        {
                            name: 'at',
                            type: 'Hash',
                            isOptional: true
                        }
                    ],
                    type: 'BlockLength'
                },
                queryProof: {
                    description: 'Generate the kate proof for the given `cells`',
                    params: [
                        {
                            name: 'cells',
                            type: 'Vec<Cell>'
                        },
                        {
                            name: 'at',
                            type: 'Hash',
                            isOptional: true
                        },
                    ],
                    type: 'Vec<u8>'
                },
                queryDataProof: {
                    description: 'Generate the data proof for the given `index`',
                    params: [
                        {
                            name: 'data_index',
                            type: 'u32'
                        },
                        {
                            name: 'at',
                            type: 'Hash',
                            isOptional: true
                        }
                    ],
                    type: 'DataProof'
                }
            }
        },
        types: {
            AppId: 'Compact<u32>',
            DataLookupIndexItem: {
                appId: 'AppId',
                start: 'Compact<u32>'
            },
            DataLookup: {
                size: 'Compact<u32>',
                index: 'Vec<DataLookupIndexItem>'
            },
            KateCommitment: {
                rows: 'Compact<u16>',
                cols: 'Compact<u16>',
                dataRoot: 'H256',
                commitment: 'Vec<u8>'
            },
            V1HeaderExtension: {
                commitment: 'KateCommitment',
                appLookup: 'DataLookup'
            },
            VTHeaderExtension: {
                newField: 'Vec<u8>',
                commitment: 'KateCommitment',
                appLookup: 'DataLookup'
            },
            HeaderExtension: {
                _enum: {
                    V1: 'V1HeaderExtension',
                    VTest: 'VTHeaderExtension'
                }
            },
            DaHeader: {
                parentHash: 'Hash',
                number: 'Compact<BlockNumber>',
                stateRoot: 'Hash',
                extrinsicsRoot: 'Hash',
                digest: 'Digest',
                extension: 'HeaderExtension'
            },
            Header: 'DaHeader',
            CheckAppIdExtra: {
                appId: 'AppId'
            },
            CheckAppIdTypes: {},
            CheckAppId: {
                extra: 'CheckAppIdExtra',
                types: 'CheckAppIdTypes'
            },
            BlockLength: {
                max: 'PerDispatchClass',
                cols: 'Compact<u32>',
                rows: 'Compact<u32>',
                chunkSize: 'Compact<u32>'
            },
            PerDispatchClass: {
                normal: 'u32',
                operational: 'u32',
                mandatory: 'u32'
            },
            DataProof: {
                root: 'H256',
                proof: 'Vec<H256>',
                numberOfLeaves: 'Compact<u32>',
                leaf_index: 'Compact<u32>',
                leaf: 'H256'
            },
            Cell: {
                row: 'u32',
                col: 'u32',
            }
        },
        signedExtensions: {
            CheckAppId: {
                extrinsic: {
                    appId: 'AppId'
                },
                payload: {}
            },
        },
    });
}

interface SignatureOptionsNew extends SignatureOptions {
    app_id: number
}

function randomDigit() {
    return Math.floor(Math.random() * 2);
}

function generateRandomBinary(size: number) {
    let binary = "0x";
    for (let i = 0; i < size; ++i) {
        binary += randomDigit();
    }
    return binary;
}

const generateData = (size: number) => {
    let buffer = Buffer.alloc(size)
    for (let i = 0; i < size; i++) {
        buffer.writeUInt8(Math.floor(Math.random() * 256), i)
    }
    return buffer.toString('hex')
}

//async funtion to get the nonce    
async function getNonce(api: ApiPromise, address: string): Promise<number> {
    const nonce = (await api.rpc.system.accountNextIndex(address)).toNumber();
    return nonce;
}

async function sendTx(api: ApiPromise, sender: KeyringPair, nonce: number): Promise<any> {
    try {

        let data = generateData(config.size);
        let submit = await api.tx.dataAvailability.submitData(data);
        /* @note here app_id is 1,
        but if you want to have one your own then create one first before initialising here */
        const options: Partial<any> = { app_id: config.app_id, nonce: nonce }
        const res = await submit
            .signAndSend(
                sender,  // sender
                options, // options
                (result: ISubmittableResult) => {
                    //uncomment the below line👇 to see the whole status flow of the transaction
                    // console.log(`Tx status: ${result.status}`);
                    if (result.status.isReady) {
                        console.log(`result is ready with nonce ${nonce}`)
                    }
                    if (result.status.isInBlock) {
                        let block_hash = result.status.asInBlock;
                        let extrinsic_hash = result.txHash;
                        console.log(`\nExtrinsic hash: ${result.txHash} with nonce ${nonce} is in block`);
                        // block(block_hash, api);
                        if (config.batch <= 1 || config.batch == undefined) {
                            setTimeout(() => {
                                get(api, block_hash, extrinsic_hash);
                            }, 5000);
                        }
                    }
                });
    } catch (e) {
        console.log(e);
        process.exit(1);
    }
}

const sendTxs = async (api: ApiPromise, sender: KeyringPair, nonce: number) => {

    const results = [];
    for (let i = 0; i < config.batch; i++) {
        const result = await sendTx(api, sender, nonce)
        results.push(result);
        nonce = nonce + 1
    }
}

//function to retreive data
async function get(api: any, block_hash: H256, extrinsic_hash: H256) {

    const block = await api.rpc.chain.getBlock(block_hash);
    const block_num: number = await block.block.header.number;

    let extrinsics = block.block.extrinsics;

    let data: Array<string> = [];
    extrinsics.forEach(async (ex: any, index: number) => {
        if (extrinsic_hash == ex.hash.toHex()) {
            console.log(index, ex.toHuman());
            const { method: { args, method, section } } = ex;
            let data_hex = args.map((a: any) => a.toString()).join(', ');
            //data retreived from the extrinsic data
            let str = ''
            for (var n = 0; n < data_hex.length; n += 2) {
                str += String.fromCharCode(parseInt(data_hex.substr(n, 2), 16));
            }
            console.log(`\n 💡 DATA_SUBMITTED : ${str}`);
            console.log(`${section}.${method}(${args.map((a: any) => a.toString()).join(', ')})`);
        }

    });
    process.exit(0);
}


let block = async (hash: H256, api: ApiPromise) => {
    const block = await api.rpc.chain.getBlock(hash);
    const block_num = await block.block.header.number;
    console.log(`💡Tx included in Block Number: ${block_num} with hash ${hash}\n`);
}


async function main() {
    const api = await createApi();
    // const alice = keyring.addFromUri('//Alice');
    // const bob = keyring.addFromUri('//Bob');
    const metadata = await api.rpc.state.getMetadata();
    const acc = keyring.addFromUri(config.mnemonic);  //and its address can be used by `acc.address`
    let nonce1 = await getNonce(api, acc.address);
    if (config.batch > 1) {
        let tx = await sendTxs(api, acc, nonce1);
    }
    else if (config.batch <= 1 || config.batch == undefined) {
        let tx = await sendTx(api, acc, nonce1)
    }
    else {
        console.log("invalid input");
    }


}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});