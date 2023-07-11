async function initalizeC2pa() {
  // Information about where to fetch the library
  const version = '0.10.1';
  const libraryUrl = `https://cdn.jsdelivr.net/npm/c2pa@${version}/+esm`;

  // Initialize the c2pa-js SDK
  const { createC2pa } = await import(libraryUrl);
  return await createC2pa({
    wasmSrc: `https://cdn.jsdelivr.net/npm/c2pa@${version}/dist/assets/wasm/toolkit_bg.wasm`,
    workerSrc: `https://cdn.jsdelivr.net/npm/c2pa@${version}/dist/c2pa.worker.min.js`,
  });
}

async function getManifests( resourceUrl, c2pa ) {
  // Read in our sample image and get a manifest store
  try {

    const { manifestStore } = await c2pa.read( resourceUrl );
    return manifestStore;

  } catch (err) {
    console.error('Error reading image:', err);
  }

}

async function isCreatedByGenerativeAI( url, c2pa ) {

	const manifests = await getManifests( url, c2pa );
  if (!manifests) { return false; }
  // TODO check for IPTC
  // TODO check for other C2PA assertions
  const assertions = Object.values(manifests).map(m => m.assertions?.get('com.adobe.generative-ai'));
  return assertions.filter(x => x !== undefined).length > 0;
}

const c2paPromise = initalizeC2pa();
const baseUrl = `https://o.img.rodeo/`;

function potentiallyAddClass( cardEl, assetUrl ) {
  c2paPromise.then( c2pa => {
    isCreatedByGenerativeAI( assetUrl, c2pa ).then( (itIs) => {
      if (itIs) {
        cardEl.classList.add('createdWithGenerativeAI');
      }
    } );
  } )
}

const cardUrl = (a) => {
  const pathNode = a.querySelector('[data-test=item-subtitle-text]')
  // fetch resources don't have this, oops
  if (!pathNode) { return null; }
  let path = pathNode.textContent;
  if ( path.slice(-1) !== '/' ) { path = path + '/'; }
  if ( path === '/' ) { path = ''; }
  // maybe some resource doesn't have this??
  const publicIdContainer = a.querySelector('[data-test=asset-info-text]');
  if (!publicIdContainer) { return null; }
  const publicId = publicIdContainer.textContent;
  return `${baseUrl}${path}${publicId}`;
}




const documentObserver = new MutationObserver( ( mutations ) => {
	for ( const mutation of mutations ) {
		for ( const newNode of mutation.addedNodes ) {
			if ( newNode.nodeType === 1
      ) {
        // console.log(newNode);
        const newCards = [ ...newNode.querySelectorAll('article.card-box:not(.seenAlready)') ];
        if ( newCards.length === 0 ) { return; }
        newCards.forEach( c => {
          // console.log(cardUrl(c));
          c.classList.add('seenAlready');
          const assetUrl = cardUrl(c);
          if ( assetUrl ) {
            potentiallyAddClass( c, assetUrl );
          }
        } );
        // rootObserver.observe( newNode, { childList: true, subtree: true } )
      }
    }
  }  
} );

// start MutationObserving the document
documentObserver.observe( document, { childList: true, subtree: true } );


// 
// const assetCards = [...document.querySelectorAll('article.card-box')];
// const assetCanonicalURLs = assetCards.map(a => {
//   let path = a.querySelector('[class*=ItemContainerPath]').textContent;
//   if ( path.slice(-1) !== '/' ) { path = path + '/'; }
//   if ( path === '/' ) { path = ''; }
//   const publicId = a.querySelctor('[data-test=asset-info-text]').textContent;
//   return `${baseUrl}${path}${publicId}`;
// });
// console.log( baseUrl );
// console.log(assetCards)
// console.log( assetCanonicalUrls )
// 