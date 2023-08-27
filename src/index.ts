require('dotenv').config();

import colors from "colors/safe";
import jayson from 'jayson';
import EosEvmMiner from './miner';
import {logger} from "./logger";

const { 
    PRIVATE_KEY = '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3',
    MINER_ACCOUNT = 'eosio.evm',
    RPC_ENDPOINTS = 'http://127.0.0.1:8888|http://192.168.1.1:8888',
    PORT = 50305,
    LOCK_GAS_PRICE = "true",
    MINER_PERMISSION = "active",
    EXPIRE_SEC = 60,
    READER_PORT = 9981
} = process.env;

const quit = (error:string) => {
    logger.error(error);
    process.exit(1);
}

if(!PRIVATE_KEY) quit('Missing PRIVATE_KEY');
if(!MINER_ACCOUNT) quit('Missing MINER_ACCOUNT');
if(!RPC_ENDPOINTS) quit('Missing RPC_ENDPOINTS');

const rpcEndpoints:Array<string> = RPC_ENDPOINTS.split('|');
if(!rpcEndpoints.length) quit('Not enough RPC_ENDPOINTS');

let lockGasPrice:boolean = LOCK_GAS_PRICE === "true";

const eosEvmMiner = new EosEvmMiner({
    privateKey: PRIVATE_KEY,
    minerAccount: MINER_ACCOUNT,
    minerPermission: MINER_PERMISSION,
    rpcEndpoints,
    lockGasPrice,
    expireSec: +EXPIRE_SEC
});

const methods = {
    eth_sendRawTransaction: function(params, callback) {
        eosEvmMiner.eth_sendRawTransaction(params).then((result:any) => {
            callback(null, result);
        }).catch((error:Error) => {
            callback({
                "code": -32000,
                "message": error.message
            });
        });
    },
    eth_gasPrice: function(params, callback) {
        eosEvmMiner.eth_gasPrice(params).then((result:any) => {
            callback(null, result);
        }).catch((error:Error) => {
            callback({
                "code": -32000,
                "message": error.message
            });
        });
    }
}

const server = new jayson.Server(methods, {
    router: function(method, params) {
        // regular by-name routing first
        console.log('--- method: ', method, ' ', params, ' ');
        if(typeof(this._methods[method]) === 'object') return this._methods[method];
        console.log(new Date().toISOString() + '--- proxy ----- ');
        return jayson.Client.http({
            port: READER_PORT
        })
    }
});

server.http().listen(PORT);

logger.info(`

███████╗ ██████╗ ███████╗    ███████╗██╗   ██╗███╗   ███╗
██╔════╝██╔═══██╗██╔════╝    ██╔════╝██║   ██║████╗ ████║
█████╗  ██║   ██║███████╗    █████╗  ██║   ██║██╔████╔██║
██╔══╝  ██║   ██║╚════██║    ██╔══╝  ╚██╗ ██╔╝██║╚██╔╝██║
███████╗╚██████╔╝███████║    ███████╗ ╚████╔╝ ██║ ╚═╝ ██║
╚══════╝ ╚═════╝ ╚══════╝    ╚══════╝  ╚═══╝  ╚═╝     ╚═╝
    EOS EVM Miner listening @ http://127.0.0.1:${colors.blue(PORT.toString())}    
        Your miner account is ${colors.blue(MINER_ACCOUNT)}  
`);

export { server, eosEvmMiner };
