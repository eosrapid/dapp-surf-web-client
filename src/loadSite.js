import {
  loadEOSPageForName,
  getPageEOSName,
  writeLoadedHTMLContent,
} from './rapidLoader';
var errorPage = "<html><head><title>Error</title></head><body><h1>Error</h1></body></html>";

function runStart(){
loadEOSPageForName(getPageEOSName())
.catch(function(error){
  console.error(error);
  return loadEOSPageForName(getPageEOSName())
})
.catch(function(error){
  console.error(error);
  return loadEOSPageForName(getPageEOSName())
})
.catch(function(error){
  console.error(error);
  writeLoadedHTMLContent(errorPage);
});

}

export {
  runStart,
}