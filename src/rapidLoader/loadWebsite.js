import {loadMetadataForDomain} from './metadataLoader';
import * as eosjsLight from 'eosjs-light';
import {inflate} from 'pako';
import {getWebsiteContractName, getNotFoundPage, getEnvConfig} from './config';
import sha256 from 'js-sha256';
import {getAssetCacheManager, supportsAssetCache} from './assetCache';


function rawStringToBytes(rawString){
  const buf = new Uint8Array(rawString.length);
  for(let i=0,l=rawString.length;i<l;i++){
    buf[i] = rawString.charCodeAt(i);
  }
  return buf;
}
function decodeSiteString(siteString){

  return inflate(rawStringToBytes(atob(siteString)), {to:"string"});
}
function getStoredWebsiteForDomain(apiUrl, websiteContractName, domain) {
  const eosRpcAPI = new eosjsLight.JsonRpc(apiUrl);
  return eosRpcAPI.get_table_rows({
    json: true,
    code: websiteContractName,
    scope: websiteContractName,
    table: 'websites',
    lower_bound: domain,
    limit: 1,
    reverse: false,
    show_payer: false,
  })
  .then(function(result){
    if(result&&result.rows&&result.rows[0]&&result.rows[0].domain===domain&&typeof result.rows[0].content==='string'){
      const content = result.rows[0].content;
      return content;
    }else{
      return null;
    }
  })

}

async function getWebsiteContentWithSha256HashSingle(apiUrl, websiteContractName, domain, sha256hash) {
  const content = await getStoredWebsiteForDomain(apiUrl, websiteContractName, domain);
  if(!content){
    throw new Error("Domain not found!");
  }
  const realSha256Hash = sha256(content).toLowerCase();

  if(realSha256Hash !== sha256hash){
    throw new Error("sha256 mismatch - expected "+sha256hash+", got "+realSha256Hash);
  }

  return content;
}
async function getWebsiteContentWithSha256HashFromAPIs(apiUrls, websiteContractName, domain, sha256hash) {
  for(let i=0,l=apiUrls.length;i<l;i++){
    try {
      const content = await getWebsiteContentWithSha256HashSingle(apiUrls[i], websiteContractName, domain, sha256hash);
      return {
        content: content,
        apiUrl: apiUrls[i],
        goodAPIUrlStartIndex: i,
      };
    }catch(err){
      console.error("Error getting website content from API "+apiUrls[i]+":", err);
    }
  }
  throw new Error("All APIs Errored out during loading!");
}

async function getWebsiteDataFromCache(hash){
  if(!supportsAssetCache()){
    throw new Error("Does not support asset cache!");
  }
  const assetCacheManager = getAssetCacheManager();
  const result = await assetCacheManager.getAssetData(hash);
  if(typeof result!=='string'){
    throw new Error("Website data not found for hash "+hash);
  }
  return result;
}

async function loadWebsiteForDomain(domain) {
  const metadataResult = await loadMetadataForDomain(domain);
  if(!metadataResult){
    //throw new Error("Website not found!");
    console.error("Website not found!");
    return getNotFoundPage();
  }
  const wsHash = metadataResult.websiteMetadata.sha256hash.toLowerCase();
  const votingApiUrls = metadataResult.votingApis.map(va=>va.apiUrl);
  let websiteContentResponse = null;
  if(supportsAssetCache()){
    try {

      const assetCacheManager = getAssetCacheManager();

      const wsCacheContent = await assetCacheManager.getAssetData(wsHash);
      if(typeof wsCacheContent!=='string'){
        throw new Error("Missing website content in cache response!");
      }
      websiteContentResponse = {
        content: wsCacheContent,
        apiUrl: votingApiUrls[0],
        goodAPIUrlStartIndex: 0,
      };
    }catch(err){
      websiteContentResponse = null;
    }
  }
  if(!websiteContentResponse){
    websiteContentResponse = await getWebsiteContentWithSha256HashFromAPIs(
      votingApiUrls,
      getWebsiteContractName(), 
      domain,
      wsHash
    );
  }
  const goodAPIUrls = metadataResult.votingApis.slice(websiteContentResponse.goodAPIUrlStartIndex).map(va=>({
    apiUrl: va.apiUrl,
    responseTime: va.responseTime,
  }))

  const currentEnvConfig = getEnvConfig();
  const websiteConfig = {
    storedMetadata: metadataResult.websiteMetadata,
    apiUrls: goodAPIUrls,
    chainId: currentEnvConfig.chainId,
  };

  const decodedContent = decodeSiteString(websiteContentResponse.content);
  return {
    content: decodedContent,
    config: websiteConfig,
  };
}


export {
  loadWebsiteForDomain,
}