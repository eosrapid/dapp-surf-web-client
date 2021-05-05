import {loadWebsiteForDomain} from './loadWebsite';
import {getNotFoundPage} from './config';


function getPageEOSName() {
  try{
    var hrefString = window.location.href + "";
    if(hrefString.indexOf("http://localhost:")===0){
      return "dappsurfweb1";
    }
    var domain = hrefString.substring(hrefString.indexOf("//")+2).split("?")[0].split("/")[0];
    var contract = domain.split(".")[0];
    if(typeof contract === 'string' && contract.length){
      return contract;
    }else{
      return null;
    }
  }catch(err){
    return null;
  }
}
function getPakoInnerText() {
  const scripts = document.body.getElementsByTagName("script") || [];
  for(var i=0;i<scripts.length;i++){
    if(scripts[i].id==="pako"){
      return scripts[i].innerText;
    }
  }
  throw new Error("Error getting pako!");
}
function insertHTMLAtStartOfBody(pageHTML, injectedHTML){
  const pageBodyPart = pageHTML.indexOf("<body>");
  if(pageBodyPart === -1){
    throw new Error("Error finding body in page!");
  }
  return pageHTML.substring(0, pageBodyPart+6)+injectedHTML+pageHTML.substring(pageBodyPart+6);
}
function finalizePageHTML(htmlContent, websiteConfig, renderMode) {
  const pakoText = getPakoInnerText();
  const configScript = "<script>window._DAPP_WEBSITE_CONFIG_JSON_ = "+JSON.stringify(websiteConfig)+";</script>";
  const newHTMLContent = insertHTMLAtStartOfBody(htmlContent, configScript+"<script>"+pakoText+"</script>");
  return newHTMLContent;
}
function writeHTMLContentToIFrame(htmlContent){
  const iframe = document.createElement('iframe');
  iframe.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;border:none;outline:none;z-index:999;background:#fff;";
  document.body.appendChild(iframe);
  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(htmlContent);
  iframe.contentWindow.document.close();


  setTimeout(function(){
    document.title = iframe.contentWindow.document.title;
  },200);
  setTimeout(function(){
    document.title = iframe.contentWindow.document.title;
  },750);
  setTimeout(function(){
    document.title = iframe.contentWindow.document.title;
  },1500);

  return iframe;
}
function writeHTMLContentToPage(htmlContent) {
  document.open();
  document.write(htmlContent);
  document.close();

}

function writeLoadedHTMLContent(htmlContent){
  return writeHTMLContentToPage(htmlContent);
}

function loadEOSPageForName(name) {
  if(!name){
    return writeLoadedHTMLContent(getNotFoundPage());
  }
  return loadWebsiteForDomain(name)
  .then(function(result){
    const finalizedHTML = finalizePageHTML(result.content, result.config, "document");
    writeLoadedHTMLContent(finalizedHTML);
  })
}
export {
  loadEOSPageForName,
  getPageEOSName,
  writeLoadedHTMLContent,
}