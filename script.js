async function fetchImage(url) {
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP! statut: ${response.status}`);
        }

        const blob = await response.blob();
        const objectURL = URL.createObjectURL(blob);
        const image = new Image();
        image.src = objectURL;

        // Attendre que l'image soit complètement chargée
        await new Promise((resolve) => {
            image.onload = resolve;
        });

        return image;
    } catch (error) {
        console.error("Erreur lors de la récupération de l'image:", error);
        return null;
    }
}

function dispTiles(tiles) {
    if (tiles.length > 0) {
        tiles.forEach(tile => {
            document.body.appendChild(tile);
        });
        console.log('Toutes les images ont été ajoutées au document.');
    } else {
        console.log('Aucune image à utiliser.');
    }
}


function mergeTiles(tiles) {
	if (!tiles.length) {
        	console.log('Aucune image à fusionner.');
	}

	const totalWidth = 256 * tiles[0].length;
	const totalHeight = 256  * tiles.length;
	const canvas = document.createElement('canvas');
	canvas.width = totalWidth;
	canvas.height = totalHeight;
	const ctx = canvas.getContext('2d');

	for (let y = 0; y < tiles.length; y++) {
		for (let x = 0; x < tiles[y].length; x++) {
        		ctx.drawImage(tiles[y][x], 256*x, 256*y);
		}
	}
	
	return new Promise((resolve) => {
        	canvas.toBlob((blob) => {
        		const mergedImage = new Image();
        		mergedImage.src = URL.createObjectURL(blob);
        		resolve({ image: mergedImage, blob });
       		}, 'image/png');
	});
}

async function main() {
	const imageContainer = document.getElementById('image-container');
	const progressText = document.getElementById('progress-text');
	const nbTiles = urls.length * urls[0].length;

	progressText.textContent = '0 / ' + nbTiles;

	let downloadedCount = 0;
	
	for (let y = 0; y < urls.length; y++) {
		savedTiles.push([]);
		for (let x = 0; x < urls[y].length; x++) {
        		const tile = await fetchImage(urls[y][x]);
        		if (tile) {
        			savedTiles[y].push(tile);
        			console.log('Image sauvegardée:', tile);
				downloadedCount++;
				progressText.textContent = downloadedCount + ' / ' + nbTiles;
        		} else {
        			console.log('Image non trouvée ou erreur lors de la récupération');
        		}
		}
	}
	if (savedTiles[0].length) {
		const { image, blob } = await mergeTiles(savedTiles);
		mergedImage = image;

		if (mergedImage) {
			progressText.textContent = 'L\'image est prête à être téléchargée';		
        		//imageContainer.innerHTML = '';
        		//imageContainer.appendChild(mergedImage);
			
			document.getElementById('downloadButton').disabled=false;
			downloadButton.onclick = () => downloadImage(blob);

			document.getElementById('openButton').disabled=false;
			openButton.onclick = () => openImage(mergedImage);
		}
	}
}



function createMap(zoom,xmin,xmax,ymin,ymax) {
	for (let y = ymin; y < ymax+1; y++) {
		urls.push([]);
		for (let x = xmin; x < xmax+1; x++) {
			const url = 'https://wmts.geopf.fr/wmts?layer=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&style=normal&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fpng&TileMatrix=' + zoom + '&TileCol=' + x + '&TileRow=' + y
			urls[y-ymin].push(url);
		}
	}
	console.log(urls)
	main();
}


function startProcess() {
	savedTiles = [];
	urls = [];

	let x1WGS = parseFloat(document.getElementById('x1').value);
	let y1WGS = parseFloat(document.getElementById('y1').value);
	let x2WGS = parseFloat(document.getElementById('x2').value);
	let y2WGS = parseFloat(document.getElementById('y2').value);

	console.log(x1WGS, y1WGS,x2WGS, y2WGS);

	let dim = Math.min(19,parseInt(document.getElementById('zoom').value));

	let x1Merc, y1Merc, x2Merc, y2Merc;
	[x1Merc, y1Merc] = proj4('EPSG:3857',[Math.min(x1WGS,x2WGS),Math.max(y1WGS,y2WGS)]);
	[x2Merc, y2Merc] = proj4('EPSG:3857',[Math.max(x1WGS,x2WGS),Math.min(y1WGS,y2WGS)]);
	

	let x1Tuile = (x1Merc - x0) / (256 * dimTuile[dim])
	let y1Tuile = (y0 - y1Merc) / (256 * dimTuile[dim])
	let x2Tuile = (x2Merc - x0) / (256 * dimTuile[dim])
	let y2Tuile = (y0 - y2Merc) / (256 * dimTuile[dim])

	let mergedImage = createMap(dim,x1Tuile,x2Tuile,y1Tuile,y2Tuile);
}


function downloadImage(blob, filename = 'merged_image.png') {
	const link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

function openImage(image) {
	const url=image.getAttribute('src');
	window.open(url);	
}

const x0 = -20037508.3427891992032528
const y0 = 20037508.3427891992032528

let dimTuile = [156543,78272,39136,19568,9784,4892,2446,1223,611,306,153,76.4370282852,38.2185141426,19.1092570713,9.5546285356,4.7773142678,2.3886571339,1.1943285670,0.5971642835,0.2985821417,0.1492910709,0.00746455354];

let savedTiles = [];
let urls = [];

