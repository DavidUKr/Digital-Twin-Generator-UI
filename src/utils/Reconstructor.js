export async function reconstructMasks(segmentation, width, height, tilesX, tilesY){

  const updatedSegmentation = [...segmentation];

  for (let i = 0; i < updatedSegmentation.length; i++) {
    const item = updatedSegmentation[i];
    if (item.split && typeof item.split === 'object') {
      item.png = await reconstructImage(item.split, width, height, tilesX, tilesY);
    } else {
      console.warn(`Skipping item ${i}: 'split' property is missing or invalid`);
    }
  }

  return updatedSegmentation;
}



// Function to load an image and return a promise
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (src instanceof File){
      src=URL.createObjectURL(src)
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}




export async function reconstructImage(tiles, fullWidth, fullHeight, tilesX, tilesY) { //x-width, y-height

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = fullWidth;
  canvas.height = fullHeight;

  // Calculate tile sizes (accounting for uneven divisions)
  const baseTileWidth = Math.floor(fullWidth / tilesX); // Base width for most tiles
  const baseTileHeight = Math.floor(fullHeight / tilesY); // Base height for most tiles

  // Store tile sizes for each position
  const tileWidths = new Array(tilesX).fill(baseTileWidth);
  const tileHeights = new Array(tilesY).fill(baseTileHeight);

  // Adjust the last column and row to account for remaining pixels
  tileWidths[tilesX - 1] = fullWidth - (tilesX - 1) * baseTileWidth;
  tileHeights[tilesY - 1] = fullHeight - (tilesY - 1) * baseTileHeight;

  try {
    const tilePromises = [];
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const rowKey = `row_${y}`;
        const colKey = `column_${x}`;
        if (!tiles[rowKey] || !tiles[rowKey][colKey]) {
          throw new Error(`Tile at ${rowKey}/${colKey} is missing`);
        }
        const tile_string=tiles[rowKey][colKey]
        tilePromises.push(loadImage(`data:image/png;base64,${tile_string}`).then(img => ({ img, x, y })));
      }
    }
    const loadedTiles = await Promise.all(tilePromises);
    for (const { img, x, y } of loadedTiles) {
      ctx.drawImage(
        img,
        0,
        0,
        img.width,
        img.height,
        x * baseTileWidth,
        y * baseTileHeight,
        tileWidths[x],
        tileHeights[y]
      );
    }

    return  canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
  } catch (error) {
    console.error('Error reconstructing image:', error);
  }
}

const reconstructMasksWithBackend = async (resultFiles) => {
      const formData = new FormData();
      formData.append('segmentation', JSON.stringify(resultFiles.segmentation))

      try{
        const request=await fetch(BackendPaths.reconstruct_image_masks, {
          method:'POST',
          body:formData
        });

        if(!request.ok) console.error('Reconstruct request failed: ', request.status);
        
        const response = await request.json();
        if(response.error){
          throw new Error(data.error);
        }

        console.log(response.reconstructed_image)
        //set mask layers
        // response.reconstructed_image.map(item => )
      }catch(e){
        console.error(e);
      };
  }