import {getWebsiteContractName, getEnvConfig,} from './config';

const envConfig = getEnvConfig();
const THRESHOLD_VOTE_FOUND_COUNT = 5;
const THRESHOLD_VOTE_FOUND_FRACTION = 0.5;

const THRESHOLD_VOTE_NOTFOUND_COUNT = 10;
const THRESHOLD_VOTE_NOTFOUND_FRACTION = 0.6;

const THRESHOLD_VOTE_ERROR_COUNT = 20;
const THRESHOLD_VOTE_ERROR_FRACTION = 0.95;


function isNonNullObject(obj){
  return typeof obj === 'object' && obj;
}
function postJSON(url, jsonObj, callback, options) {
  const realOptions = options || {};


  const xhr = new XMLHttpRequest();
  if(typeof realOptions.timeout === 'number') {
    xhr.timeout = realOptions.timeout;
  }
  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      var response = null;
      try {
        response = JSON.parse(xhr.responseText);
      }catch(err){
        return callback(err);
      }
      callback(null, response);
    }else{
      callback(new Error("Error status code from server: "+xhr.status))
    }
  };

  xhr.onerror = (err) => {
    callback(err);
  };

  xhr.open('POST', url);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify(jsonObj));
  return xhr;
}

function getWebsiteMetadataForDomain(apiUrl, domain, callback, requestOptions){
  const url = apiUrl+"/v1/chain/get_table_rows";
  const websiteContractName = getWebsiteContractName();
  const data = {
    "json": true,
    "code": websiteContractName,
    "scope": websiteContractName,
    "table": "wsmetadata",
    "table_key": "",
    "lower_bound": domain,
    "upper_bound": null,
    "index_position": 1,
    "key_type": "",
    "limit": "1",
    "reverse": false,
    "show_payer": false
  };
  return postJSON(url, data, (err, result)=>{
    if(err){
      return callback(err);
    }
    if(
      isNonNullObject(result) &&
      Array.isArray(result.rows)
    ){
      if(
        result.rows.length !== 0 &&
        isNonNullObject(result.rows[0]) &&
        typeof result.rows[0].domain === 'string' &&
        result.rows[0].domain === domain
      ){
        callback(null, result.rows[0]);
      }else{
        callback(null, {domainNotFound: true});
      }
    }else{
      callback(new Error("Invalid response from the server or domain not found!"));
    }
  }, requestOptions);
}
function domainMetadataToKey(r){
  return [
    r.domain,
    r.owner,
    r.sha256hash,
    r.platform_version,
    r.tier,
    r.mode,
    r.settings,
    r.language,
    r.content_updated_at,
    r.created_at,
  ].join("|");
}


function processResultMap(apiUrls, resultMap) {
  const reportingKeys = Object.keys(resultMap);
  const numReporting = reportingKeys.length;
  const numTotalApis = apiUrls.length;
  const resolvedFound = reportingKeys.filter(k=>resultMap[k].result && !resultMap[k].domainNotFound);
  const resolvedNotFound = reportingKeys.filter(k=>resultMap[k].result && resultMap[k].domainNotFound);
  const resolvedError = reportingKeys.filter(k=>resultMap[k].error || !resultMap[k].result);
  const numErrors = resolvedError.length;
  const numNotFound = resolvedNotFound.length;

  const metadataVotes = {};
  let mostVotesKey = null, mostVotesAmount = 0;
  resolvedFound.forEach(apiUrl=>{
    const metadataKey = domainMetadataToKey(resultMap[apiUrl].result);
    if(metadataVotes.hasOwnProperty(metadataKey)){
      metadataVotes[metadataKey].push(apiUrl);
    }else{
      metadataVotes[metadataKey] = [apiUrl];
    }
    const curVotes = metadataVotes[metadataKey].length;
    if(curVotes>mostVotesAmount){
      mostVotesKey = metadataKey;
      mostVotesAmount = curVotes;
    }
  });

  if(
    numErrors === numTotalApis ||
    numErrors >= THRESHOLD_VOTE_ERROR_COUNT ||
    (numErrors/numTotalApis)>=THRESHOLD_VOTE_ERROR_FRACTION
  ){
    return {
      finished: true,
      resultType: "error",
      error: resultMap[resolvedError[0]].error,
    };
  }
  if(
    mostVotesAmount>=THRESHOLD_VOTE_FOUND_COUNT ||
    (mostVotesAmount/(numTotalApis-numErrors))>=THRESHOLD_VOTE_FOUND_FRACTION
  ){
    return {
      finished: true,
      resultType: "found",
      websiteMetadata: Object.assign({}, resultMap[metadataVotes[mostVotesKey][0]].result),
      votingApis: metadataVotes[mostVotesKey].map(k=>resultMap[k]),
    }
  }
  if(
    numNotFound>THRESHOLD_VOTE_NOTFOUND_COUNT ||
    (numNotFound/(numTotalApis-numErrors)) >= THRESHOLD_VOTE_NOTFOUND_FRACTION

  ){
    return {
      finished: true,
      resultType: "not_found",
    };
  }else{

  }
  if(numTotalApis === numReporting){
    const maxWinner = Math.max(numErrors, numNotFound, mostVotesAmount);
    if(maxWinner === mostVotesAmount){
      return {
        finished: true,
        resultType: "found",
        websiteMetadata: Object.assign({}, resultMap[metadataVotes[mostVotesKey][0]].result),
        votingApis: metadataVotes[mostVotesKey].map(k=>resultMap[k]),
      }
    }else if(numErrors === maxWinner){
      return {
        finished: true,
        resultType: "error",
        error: resultMap[resolvedError[0]].error,
      };
    }else{
      return {
        finished: true,
        resultType: "not_found",
      };
    }
  }else{
    return{
      resultType: "loading",
    };
  }
}
function getMultiSourceMetadata(apiUrls, domain, timeoutTime) {
  return new Promise((resolve, reject)=>{
    const requestOptions = {
      timeout: timeoutTime,
    };
    const resultMap = {};

    let currentReporting = 0;
    let isDone = false;
    const totalApiUrls = apiUrls.length;
    let xhrList = [];
    const startTime = performance.now();

    function metadataCallback(apiUrl, err, result){
      if(isDone){
        return;
      }
      currentReporting++;
      if(err){
        resultMap[apiUrl] = {apiUrl: apiUrl, error: err, responseTime: performance.now()-startTime};
      }else{
        const domainNotFound = isNonNullObject(result) && result.domainNotFound;
        resultMap[apiUrl] = {apiUrl: apiUrl, result: result, domainNotFound: domainNotFound, responseTime: performance.now()-startTime};
      }
      const currentResult = processResultMap(apiUrls, resultMap);
      if(currentResult.finished){
        isDone = true;
        resolve(currentResult);
        xhrList.forEach(xhr=>xhr.abort());
      }else if(currentReporting === totalApiUrls){
        // if we get here, there is a bug
        xhrList.forEach(xhr=>xhr.abort());
        reject(new Error("Got to the end with no definitive result!"));
      }
    }
    xhrList = apiUrls.map(apiUrl=>getWebsiteMetadataForDomain(apiUrl, domain, (err, result)=>{
      metadataCallback(apiUrl, err, result);
    }, requestOptions));
  });
}


async function loadMetadataForDomain(domain) {
  const result = await getMultiSourceMetadata(envConfig.apiUrls, domain, 30000);
  if(result.resultType === "found"){
    return result;
  }else if(result.resultType === "not_found"){
    return null;
  }else{
    throw (result.error||new Error("Unknown Error"));
  }
}

export {
  loadMetadataForDomain,
}