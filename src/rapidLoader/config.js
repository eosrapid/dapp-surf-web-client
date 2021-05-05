const JUNGLE_ENV_CONFIG = {
  chainId: '2a02a0053e5a8cf73a56ba0fda11e4d92e0238a4a2aa74fccf46d5a910746840',
  siteContract: 'dappsurfweb1',
  assetContract: 'debugstorage',
  siteSuffixes: [".jungle3.eos.cab"],
  slug: "jungle",
  apiUrls: [
    "https://jungle3.eossweden.org",
    "https://jungle.eosn.io",
    "https://jungle3.cryptolions.io",
    "https://api.jungle3.alohaeos.com",
    "https://jungle.eosphere.io"
  ],
};

const MAINNET_ENV_CONFIG = {
  chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
  siteContract: 'dappsurfweb1',
  assetContract: 'debugstorage',
  siteSuffixes: [".dapp.surf", ".net.inc"],
  slug: "mainnet",
  apiUrls: [
    "https://api.eosrapid.com",
    "https://mainnet.eoscannon.io",
    "https://api-mainnet.starteos.io",
    "https://eos.newdex.one",
    "https://eos.blockeden.cn",
    "https://mainnet.eosio.sg",
    "https://eos.greymass.com",
    "https://node1.zbeos.com",
    "https://api.eossweden.org",
    "https://mainnet.genereos.io",
    "https://fn001.eossv.org",
    "https://api.eosflare.io",
    "https://api.eos.cryptolions.io",
    "https://api1.eosasia.one",
    "https://api.eoseoul.io",
    "https://api.main.alohaeos.com",
    "https://api.eosn.io",
    "https://api.eosargentina.io",
    "https://eosbp.atticlab.net",
    "https://api.helloeos.com.cn",
    "https://api.eosrio.io",
    "https://api.eoslaomao.com",
    "https://eos.eoscafeblock.com"
  ],
};
const SUFFIX_TO_SLUG_MAP = {};
Object.keys(JUNGLE_ENV_CONFIG.siteSuffixes).map(s=>SUFFIX_TO_SLUG_MAP[s] = JUNGLE_ENV_CONFIG.slug);
Object.keys(MAINNET_ENV_CONFIG.siteSuffixes).map(s=>SUFFIX_TO_SLUG_MAP[s] = MAINNET_ENV_CONFIG.slug);


function getDomainFromURL(urlString){
  const noQuery = urlString.split("?")[0];
  const noHash = noQuery.split("#")[0];
  const protoInd = noHash.indexOf("://");
  if(protoInd===-1){
    return null;
  }
  const noProto = noHash.substring(protoInd+3).split("/")[0];
  return noProto;
}
function getCurrentEnvSlug() {
  try {
    const hrefString = window.location.href;
    
    if(hrefString.indexOf("http://localhost:")===0){
      return "jungle";
    }
    const domainStr = getDomainFromURL(hrefString).toLowerCase();
    const domainStrLength = domainStr.length;
    const suffixesSorted = Object.keys(SUFFIX_TO_SLUG_MAP).sort((a,b)=>{
      if(a.length !== b.length){
        return b.length-a.length;
      }else{
        return a<b?-1:1;
      }
    });
    const goodSuffix = suffixesSorted.filter(s=>s.length<domainStrLength&&domainStr.substr(-s.length)===s)[0];
    if(!goodSuffix){
      return "mainnet";
    }else{
      return SUFFIX_TO_SLUG_MAP[goodSuffix] || "mainnet";
    }


  }catch(err){
    return "mainnet";
  }
}
const ENV_CONFIG = {
  "jungle": JUNGLE_ENV_CONFIG,
  "mainnet": MAINNET_ENV_CONFIG,
};
const CURRENT_ENV = getCurrentEnvSlug();

function getEnvConfig() {
  return ENV_CONFIG[CURRENT_ENV];
}

function getWebsiteContractName() {
  return getEnvConfig().siteContract;
}
function getAssetContractName() {
  return getEnvConfig().assetContract;
}

function getNotFoundPage() {
  return "<html><head><title>Not Found</title></head><body><h1>Not Found</h1></body></html>";
}

export {
  getWebsiteContractName,
  getAssetContractName,
  getEnvConfig,
  getNotFoundPage,
}