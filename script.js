//Effectue une requête pour récupérer une tuile
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

//Fusionne les tuiles télécharger pour créer le fond de plan
function mergeTiles(tiles) {
	if (!tiles.length) {
        	console.log('Aucune image à fusionner.');
	}

	//La taille standard des tuiles est de 256*256px
	//À modifier si des tuiles n'ont pas cette taille
	const totalWidth = 256 * tiles[0].length;
	const totalHeight = 256  * tiles.length;

	//Création d'un objet canvas pour traiter les tuiles
	const canvas = document.createElement('canvas');
	canvas.width = totalWidth;
	canvas.height = totalHeight;
	const ctx = canvas.getContext('2d');

	for (let y = 0; y < tiles.length; y++) {
		for (let x = 0; x < tiles[y].length; x++) {
				//Ajoute chaque tuile sur le canvas au bon endroit
        		ctx.drawImage(tiles[y][x], 256*x, 256*y);
		}
	}
	
	//Transforme le canvas en image png
	return new Promise((resolve) => {
        	canvas.toBlob((blob) => {
        		const mergedImage = new Image();
        		mergedImage.src = URL.createObjectURL(blob);
        		resolve({ image: mergedImage, blob });
       		}, 'image/png');
	});
}

//Coordonne les différentes opérations la crátion du fond de plan
async function main() {
	const imageContainer = document.getElementById('image-container');
	const progressText = document.getElementById('progress-text');
	const nbTiles = urls.length * urls[0].length;

	//Initialise l'affichage de la progression
	progressText.textContent = '0 / ' + nbTiles;

	let downloadedCount = 0;
	//let startTime = Date.now();

	//Récupération de toutes les tuiles
	for (let y = 0; y < urls.length; y++) {
		savedTiles.push([]);
		for (let x = 0; x < urls[y].length; x++) {
        		const tile = await fetchImage(urls[y][x]);
        		if (tile) {
        			savedTiles[y].push(tile);
				downloadedCount++;			
				progressText.textContent = downloadedCount + ' / ' + nbTiles; //+ Math.round((nbTiles-downloadedCount) * ((Date.now()-startTime) / downloadedCount) / 1000) + 's restantes'
        		} else {
        			console.log('Image non trouvée ou erreur lors de la récupération');
        		}
		}
	}

	//Fusion des tuiles
	if (savedTiles[0].length) {
		const { image, blob } = await mergeTiles(savedTiles);
		mergedImage = image;

		//Activation des bouttons
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

//Génère les URLs de requête pour chaque tuile ligne par ligne
function createURLs(zoom,xmin,xmax,ymin,ymax,layer) {
	for (let y = ymin; y < ymax+1; y++) {
		urls.push([]);
		for (let x = xmin; x < xmax+1; x++) {
			let url = '';
			if (layer == "plan_ign") {
				url = "https://wmts.geopf.fr/wmts?layer=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&style=normal&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fpng&TileMatrix=" + zoom + '&TileCol=' + x + '&TileRow=' + y;
			}
			else if (layer == "orthophotos_ign") {
				url = "https://wmts.geopf.fr/wmts?layer=ORTHOIMAGERY.ORTHOPHOTOS&style=normal&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&TileMatrix=" + zoom + '&TileCol=' + x + '&TileRow=' + y;
			}
			else if (layer == "topo_ign") {
				url = "https://data.geopf.fr/private/wmts?apikey=ign_scan_ws&layer=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR&style=normal&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&TileMatrix=" + zoom + '&TileCol=' + x + '&TileRow=' + y;
			}
			else if (layer == "osm") {
				url = 'https://tile.openstreetmap.org/' + zoom + '/' + Math.round(x) +'/' + Math.round(y) + '.png'
			}	
			
			urls[y-ymin].push(url);
		}
	}
	main();
}

//Initialise les paramètre du fond de plan en fonction des informations renseignées
function startProcess() {
	savedTiles = [];
	urls = [];

	//Récupération des coordonnées, de la couche et du niveau de détails
	let x1WGS = parseFloat(document.getElementById('x1').value);
	let y1WGS = parseFloat(document.getElementById('y1').value);
	let x2WGS = parseFloat(document.getElementById('x2').value);
	let y2WGS = parseFloat(document.getElementById('y2').value);
	let layer = document.getElementById('layer').value
	let dim = parseInt(document.getElementById('zoom').value);

	//Conversion des coordonnées (degrès décimaux) en Web Mercator
	let x1Merc, y1Merc, x2Merc, y2Merc;
	[x1Merc, y1Merc] = proj4('EPSG:3857',[Math.min(x1WGS,x2WGS),Math.max(y1WGS,y2WGS)]);
	[x2Merc, y2Merc] = proj4('EPSG:3857',[Math.max(x1WGS,x2WGS),Math.min(y1WGS,y2WGS)]);
	
	//Conversion des coordonnés (Web Mercator) en coordonnées dans le repére de la matrice de tuiles utilisée
	let x1Tuile = (x1Merc - x0) / (256 * dimTuile[dim])
	let y1Tuile = (y0 - y1Merc) / (256 * dimTuile[dim])
	let x2Tuile = (x2Merc - x0) / (256 * dimTuile[dim])
	let y2Tuile = (y0 - y2Merc) / (256 * dimTuile[dim])

	//Création du fond de plan
	let mergedImage = createURLs(dim,x1Tuile,x2Tuile,y1Tuile,y2Tuile,layer);
}

//Télécharge l'image
function downloadImage(blob, filename = 'merged_image.png') {
	const link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

//Ouvre l'image dans un nouvel onglet
function openImage(image) {
	const url=image.getAttribute('src');
	window.open(url);	
}

//Ajoute un marker sur la carte pour délimiter la zone
function onMapClick(e) {
	//Récupération des coordonnés du clic
	lat = e.latlng.lat;
	lng = e.latlng.lng;

	//Vérifie si tous les markers ne sont pas déjà placé et ajoute un marker dans la liste des markers
	if (markers.length < 2) {
		marker = L.marker(e.latlng, {draggable : true}).addTo(map);
		markers.push(marker);

		//Vérifie si aucun marker n'est placé sur la carte
		if (markers.length == 1) {
			//Modifie les coordonnés si le marker est déplacé
			marker.on('drag', function () {
				lat = this.getLatLng().lat;
				lng = this.getLatLng().lng;
				cornersCoords[0]= [lat,lng];
				document.getElementById('y1').value = Math.round(lat*10000)/10000;
				document.getElementById('x1').value = Math.round(lng*10000)/10000;
				//Vérifie si une zone est définie pour la modifier
				if (cornersCoords[1][0]) {
					area.setBounds([[cornersCoords[0][0], cornersCoords[0][1]], [cornersCoords[1][0], cornersCoords[1][1]]]);
				}; 
			});
			//Définie les coordonnés du premier coin de la zone et modifie les coordonnées dans l'input
			cornersCoords[0]= [lat,lng];
			document.getElementById('y1').value = Math.round(lat*10000)/10000;
			document.getElementById('x1').value = Math.round(lng*10000)/10000;

			//Réactive les inputs des coordonnées du premier point
			document.getElementById('y1').disabled = false;
			document.getElementById('x1').disabled = false;
		}
		//Vérifie si un seul marker est placé sur la carte
		if (markers.length == 2) {
			//Modifie les coordonnés si le marker est déplacé
			marker.on('drag', function () {
				lat = this.getLatLng().lat;
				lng = this.getLatLng().lng;
				cornersCoords[1]= [lat,lng];
				document.getElementById('y2').value = Math.round(lat*10000)/10000;
				document.getElementById('x2').value = Math.round(lng*10000)/10000;
				area.setBounds([[cornersCoords[0][0], cornersCoords[0][1]], [cornersCoords[1][0], cornersCoords[1][1]]]);
			});
			//Définie les coordonnés du deuxième coin de la zone et modifie les coordonnées dans l'input
			cornersCoords[1]= [lat,lng];
			document.getElementById('y2').value = Math.round(lat*10000)/10000;
			document.getElementById('x2').value = Math.round(lng*10000)/10000;

			//Crée visuellement une zone rectangulaire sur la carte
			area = L.rectangle([[cornersCoords[0][0], cornersCoords[0][1]], [cornersCoords[1][0], cornersCoords[1][1]]]).addTo(map);

			//Réactive les inputs des coordonnées du deuxième point
			document.getElementById('y2').disabled = false;
			document.getElementById('x2').disabled = false;
		}
	}	
}

//Modifie la carte et le paramètre des input lorsque le paramètre de couche est modifié
function layerChange() {
	const layer = document.getElementById("layer").value;
	const zoom = document.getElementById("zoom");
	const zoom_value = zoom.value;
	const mapData = mapsData[layer];

	//Modifie la valeur max de zoom possible pour la couche
	zoom.max = mapData.zoom_max;
	if (mapData.zoom_max < zoom_value) {
		zoom.value = null;
	}

	//Supprime la couche de tuile actuelle et la remplace par une nouvelle
	map.eachLayer(function (layer) {
		//Vérifie si la couche est une couche de tuile (et non les markers)
		//Pas très propre mais pas d'autre solution pour le moment
		if (layer.options.maxZoom) {
			map.removeLayer(layer);
		}
	});
	mapData.layer.addTo(map);
}

//Met à jour la position des markers et de la zone lorsque les coordonnés sont modifiées via l'input
function updateMarkers(idMarker) {
	const x1 = document.getElementById("x1").value;
	const y1 = document.getElementById("y1").value;
	const x2 = document.getElementById("x2").value;
	const y2 = document.getElementById("y2").value;

	//Vérifie si un seul marker est déjá placé et met à jour les coords
	if (markers.length == 1) {
		markers[0].setLatLng([y1,x1]);
		cornersCoords[0] = [y1,x1];
	}
	//Vérifie si les deux markers sont déjà placés et met à jours les coords et la zone
	else if (markers.length == 2) {
		markers[0].setLatLng([y1,x1]);
		markers[1].setLatLng([y2,x2]);
		area.setBounds([[y1,x1],[y2,x2]]);
		cornersCoords = [[y1,x1],[y2,x2]];
	}
}

//Affiche ou non les images exemples
function showImages(layer) {
    document.getElementById(layer + '-images').style.display = 'block';
}
function hideImages(layer) {
    document.getElementById(layer + '-images').style.display = 'none';
}


//Définition des coordonnées de référence en Web Mercator
const x0 = -20037508.3427891992032528
const y0 = 20037508.3427891992032528

//Définition des dimension des tuiles pour chaque niveau de zoom
let dimTuile = [156543,78272,39136,19568,9784,4892,2446,1223,611,306,153,76.4370282852,38.2185141426,19.1092570713,9.5546285356,4.7773142678,2.3886571339,1.1943285670,0.5971642835,0.2985821417,0.1492910709,0.00746455354];

let savedTiles = [];
let urls = [];

let markers = [];

let cornersCoords = [[],[]];

let area;

//Création de l'objet carte Leaflet
const map = L.map('map').setView([45.75789, 4.86292], 12);

//Définition des couches de tuiles
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: 'Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
	maxZoom: 19
});

const plan_ignLayer = L.tileLayer('https://wmts.geopf.fr/wmts?layer=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&style=normal&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fpng&TileMatrix={z}&TileCol={x}&TileRow={y}', {
	attribution: "IGN-F/Géoportail",
	maxZoom: 19
});

const orthophotos_ignLayer = L.tileLayer('https://wmts.geopf.fr/wmts?layer=ORTHOIMAGERY.ORTHOPHOTOS&style=normal&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&TileMatrix={z}&TileCol={x}&TileRow={y}', {
	attribution: "IGN-F/Géoportail",
	maxZoom: 19
});

const topo_ignLayer = L.tileLayer('https://data.geopf.fr/private/wmts?apikey=ign_scan_ws&layer=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR&style=normal&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&TileMatrix={z}&TileCol={x}&TileRow={y}', {
	attribution: "IGN-F/Géoportail",
	minZoom: 6,
	maxZoom: 16
});

//Définition de donnés pour chaque couche
let mapsData = {
	"plan_ign" : {
		nom : "Plan IGN",
		zoom_max : 19,
		layer : plan_ignLayer},
	"orthophotos_ign" : {
		nom : "Orthophotos IGN",
		zoom_max : 19,
		layer : orthophotos_ignLayer},
	"topo_ign" : {
		nom : "Carte topograhphique IGN",
		zoom_max : 16,
		layer : topo_ignLayer},
	"osm" : {
		nom : "OpenStreetMap",
		zoom_max : 19,
		layer : osmLayer}
}

//Ajoute la couche de tuile sur la carte Leaflet
mapsData[document.getElementById("layer").value].layer.addTo(map);

map.on('click', onMapClick);