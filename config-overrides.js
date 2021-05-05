const path = require('path');
const InlineAssetsHtmlPlugin = require('./InlineAssetsHtmlPlugin')
const svgToMiniDataURI = require('mini-svg-data-uri');

function replaceURLLoader(rulesList, modifyUrlLoader){
  let isTrue = false;
  for(let i = 0; i<rulesList.length;i++){
    const ruleItem = rulesList[i];
    if(ruleItem && typeof ruleItem === 'object'){
      if(ruleItem.loader&&ruleItem.loader.indexOf("file-loader")!==-1){
        //console.log(ruleItem, i, rulesList)
      }
      if(typeof ruleItem.loader === 'string' && ruleItem.loader.split("/").indexOf("url-loader")!==-1&&ruleItem.test){
        rulesList[i] = modifyUrlLoader(ruleItem);
        isTrue = true;
      }else if(Array.isArray(ruleItem.oneOf)){
        const result = replaceURLLoader(ruleItem.oneOf, modifyUrlLoader);
        if(result){
          isTrue = true;
        }
      }
    }
  }
  return isTrue;
}


function processExternals(config, env) {
  const baseExternals = {
    'pako': 'pako',
  };

  const addedExternals = {}//configFinal.allExternals;

  config.externals = Object.assign(
    {},
    config.externals||{},
    baseExternals,
    addedExternals
  );
}

module.exports = function override(config, env) {
  config.module = config.module || {};
  /*config.module.rules = config.module.rules || [];
  
  const newUrlLoader = {
    test: /\.(png|jpg|gif)$/i,
    use: [
      {
        loader: 'url-loader',
        options: {
          limit: false,
        },
      },
    ],
  };
  const didModifyUrlLoader = replaceURLLoader(config.module.rules, ()=>newUrlLoader);
  if(!didModifyUrlLoader){

    config.module.rules = [newUrlLoader].concat(config.module.rules);
  }
  console.log(JSON.stringify(config))
  */
 processExternals(config, env);
 config.module.rules[2].oneOf[0].options.limit = 1000*1000;
 config.module.rules[2].oneOf.splice(1,0,{
  test: /\.svg$/i,
  use: [
    {
      loader: 'url-loader',
      options: {
        generator: (content) => svgToMiniDataURI(content.toString()),
      },
    },
  ],
});


  const newPlugins = config.plugins.concat([]);
  const inlineInst = new InlineAssetsHtmlPlugin({
    test: /\.(css|js|png|svg|jpg)$/, // Required: regexp test of files to inline,
    emit: false // Optional: to emit the files that were inlined. Defaults to false (remove the files)
  });
  newPlugins.splice(1,0, inlineInst);
  config.plugins = newPlugins;

  //do stuff with the webpack config...
  config.resolve.alias["react"] = "preact/compat";
  config.resolve.alias["react-dom/test-utils"] = "preact/test-utils";
  config.resolve.alias["react-dom"] = "preact/compat";
  config.resolve.alias['@'] = path.resolve(__dirname, 'src');

  return config;
}