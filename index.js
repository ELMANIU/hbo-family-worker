const WORKER_VERSION = "HBO-FAMILY-1.0.0";


const CANALES = {

hbo_family: {

nombre:"HBO FAMILY HD",

descripcion:
"Películas y series familiares 24/7",


epoch:
Date.UTC(2026,0,1,0,0,0)/1000,


programas:[


{
nombre:"SHREK",
tipo:"pelicula",
url:
"https://hugh.cdn.rumble.cloud/video/fwe2/44/s8/2/S/4/Q/2/S4Q2A.gaa.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl&r_range=1490550784-1490607269"
},



{
nombre:"LAS CHICAS SUPERPODEROSAS T1 E01",
tipo:"serie",
url:
"https://hugh.cdn.rumble.cloud/video/fww1/8c/s8/2/a/2/R/2/a2R2A.haa.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl&r_range=701743616-701757342"
},



{
nombre:"LAS CHICAS SUPERPODEROSAS T1 E02",
tipo:"serie",
url:
"https://hugh.cdn.rumble.cloud/video/fww1/9a/s8/2/I/k/S/2/IkS2A.haa.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl&r_range=701710848-701724579"
},



{
nombre:"LAS CHICAS SUPERPODEROSAS T1 E03",
tipo:"serie",
url:
"https://hugh.cdn.rumble.cloud/video/fww1/9f/s8/2/K/v/S/2/KvS2A.haa.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl&r_range=696461312-696474940"
}


]

}

};





const SEGMENTOS_ATRAS = 15;
const SEGMENTOS_ADELANTE = 12;



let CACHE = null;



// =======================
// CARGAR PLAYLIST HLS
// =======================


async function fetchHLS(url){


const r = await fetch(url,{

headers:{
"User-Agent":"HBO-FAMILY-WORKER"
}

});


if(!r.ok)

throw new Error(
"Error cargando "+url
);


return await r.text();


}





function resolverURL(base,uri){


return new URL(uri,base).href;


}





async function cargarSegmentos(item){


const texto =
await fetchHLS(item.url);



const base =
new URL(item.url);



let segmentos=[];

let duracion=0;



const lineas =
texto.split("\n");



let pendiente=0;



for(let linea of lineas){


linea=linea.trim();


if(linea.startsWith("#EXTINF")){


pendiente =
parseFloat(
linea.split(":")[1]
);


}



if(
linea &&
!linea.startsWith("#")
&& pendiente
){


segmentos.push({

url:
resolverURL(
base,
linea
),

duracion:
pendiente

});


duracion+=pendiente;


pendiente=0;


}


}



return {

item,

segmentos,

duracion

};


}






async function crearHorario(){


let salida=[];


for(const programa of CANALES.hbo_family.programas){


const data =
await cargarSegmentos(programa);



salida.push(data);


}



return salida;


}







async function obtenerHorario(){


if(!CACHE){

CACHE =
await crearHorario();

}


return CACHE;


}







// =======================
// POSICION DEL CANAL
// =======================


function estadoActual(horario){


let total=0;


for(const p of horario)

total+=p.duracion;



let tiempo =
Math.floor(Date.now()/1000);



let posicion =
(tiempo -
CANALES.hbo_family.epoch)
% total;



let acumulado=0;



for(const bloque of horario){


if(
posicion <
acumulado+bloque.duracion
){


return {

bloque,

offset:
posicion-acumulado

};


}


acumulado+=bloque.duracion;


}


return {

bloque:
horario[0],

offset:0

};


}








function generarPlaylist(horario){


const estado =
estadoActual(horario);



const bloque =
estado.bloque;



let index=0;

let tiempo=0;



while(
tiempo+bloque.segmentos[index].duracion
<= estado.offset
){


tiempo+=
bloque.segmentos[index].duracion;


index++;


if(index>=bloque.segmentos.length)

index=0;


}





let lista=[


"#EXTM3U",

"#EXT-X-VERSION:3",

"#EXT-X-TARGETDURATION:10",

"#EXT-X-MEDIA-SEQUENCE:0"


];



for(
let i=0;
i<SEGMENTOS_ADELANTE;
i++
){


const seg =
bloque.segmentos[index];



lista.push(

"#EXTINF:"+
seg.duracion+
","

);


lista.push(seg.url);



index++;


if(index>=bloque.segmentos.length)

break;


}



return lista.join("\n");

}





// =======================
// WORKER
// =======================


export default {


async fetch(request){


const url =
new URL(request.url);



try{


if(
url.pathname==
"/"
){


return new Response(

JSON.stringify({

service:
"HBO FAMILY WORKER",

version:
WORKER_VERSION,

live:
url.origin+
"/hbo_family/live.m3u8"

},null,2),

{

headers:{
"content-type":
"application/json"
}

}

);

}





if(
url.pathname==
"/hbo_family/live.m3u8"
){



const horario =
await obtenerHorario();



const playlist =
generarPlaylist(horario);



return new Response(

playlist,

{

headers:{


"content-type":
"application/vnd.apple.mpegurl",


"cache-control":
"no-cache"

}

}

);



}




if(
url.pathname==
"/hbo_family/status"
){


const horario =
await obtenerHorario();


const estado =
estadoActual(horario);



return new Response(

JSON.stringify({

canal:
"HBO FAMILY HD",

ahora:
estado.bloque.item.nombre,

offset:
estado.offset,

version:
WORKER_VERSION

},null,2),

{

headers:{
"content-type":
"application/json"
}

}

);


}




return new Response(
"No encontrado",
{
status:404
}
);


}

catch(e){


return new Response(

JSON.stringify({

error:
e.message,

version:
WORKER_VERSION

},null,2),

{

status:500,

headers:{
"content-type":
"application/json"
}

}

);


}


}


};
